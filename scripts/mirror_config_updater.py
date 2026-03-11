import os
import json
import re
import argparse
from pathlib import Path
from typing import Dict, List, Tuple, Set
from collections import defaultdict
import time

class MirrorUpdater:
    def __init__(self, data_dir: str, config_file: str):
        self.data_dir = Path(data_dir)
        self.config_file = Path(config_file)
        self.config = {}
        
        # 全局排除的目录（软件源相关）
        self.global_exclude_dirs = {
            'pool', 'dists', 'repodata', 'Packages', 'Release',
            'os', 'updates', 'extras', 'centosplus', 'contrib',
            'main', 'restricted', 'universe', 'multiverse',
            'non-free', 'contrib', 'binary-amd64', 'binary-i386',
            'source', 'debug', 'AppStream', 'BaseOS', 'PowerTools',
            'HighAvailability', 'ResilientStorage', 'RT', 'NFV', '.pool',
            'security', 'upload', 'bugFix'  # openEuler 特有的排除目录
        }
        
        # 定义各个发行版的文件匹配规则（优化版）
        self.patterns = {
            'ubuntu': {
                'scan_paths': ['ubuntu-releases'],
                'max_depth': 2,
                'pattern': r'ubuntu-releases/([^/]+)/ubuntu-(\d+\.\d+(?:\.\d+)?)-([^-]+)-([^.]+)\.iso$',
                'exclude_dirs': set(),
                'filter_latest': True,  # 启用最新版本过滤
            },
            'debian': {
                'scan_paths': ['debian-cd'],
                'max_depth': 5,
                'pattern': r'debian-cd/(\d+\.\d+\.\d+)(?:-live)?/([^/]+)/iso-([^/]+)/(.+\.iso)$',
                'exclude_dirs': {'bt-cd', 'bt-dvd', 'jigdo-cd', 'jigdo-dvd', 'list-cd', 'list-dvd'},
                'filter_latest': True,
            },
            'rocky': {
                'scan_paths': ['rocky/8/isos', 'rocky/9/isos', 'rocky/10/isos'],
                'max_depth': 2,
                'pattern': r'rocky/(\d+)/isos/([^/]+)/Rocky-(\d+)-latest-([^-]+)-([^.]+)\.iso$',
                'exclude_dirs': set(),
                'filter_latest': False,  # rocky已经是latest，不需要过滤
            },
            'centos': {
                'scan_paths': ['centos-vault/7.9.2009/isos', 'centos-vault/6.9/isos'],
                'max_depth': 2,
                'pattern': r'centos-vault/(\d+(?:\.\d+\.\d+)?)/isos/([^/]+)/CentOS-(\d+)-([^-]+)-([^-]+)-(\d+)-(\d+)\.iso$',
                'exclude_dirs': set(),
                'filter_latest': False,
            },
            'archlinux': {
                'scan_paths': ['archlinux/iso/latest'],
                'max_depth': 1,
                'pattern': r'archlinux/iso/latest/archlinux-([^.]+)\.iso$',
                'exclude_dirs': set(),
                'filter_latest': False,
            },
            'openeuler': {
                'scan_paths': ['openeuler'],
                'max_depth': 4,
                'pattern': r'openeuler/(openEuler-[\d\.]+-LTS(?:-SP\d+)?)/ISO/([^/]+)/(openEuler-[\d\.]+-LTS(?:-SP\d+)?)-(?:(everything|netinst|everything-debug)-)?([^-]+)-dvd\.iso$',
                'exclude_dirs': {'security', 'upload', 'bugFix'},
                'filter_latest': True,  # 启用最新版本过滤
            },
            'kali': {
                'scan_paths': ['kali-images/current'],
                'max_depth': 1,
                'pattern': r'kali-images/current/kali-linux-([^-]+)-installer(?:-netinst)?-([^.]+)\.iso$',
                'exclude_dirs': set(),
                'filter_latest': False,
            }
        }
    
    def load_config(self):
        """加载现有配置文件"""
        with open(self.config_file, 'r', encoding='utf-8') as f:
            self.config = json.load(f)
    
    def should_skip_dir(self, dirname: str, distro_excludes: Set[str]) -> bool:
        """判断是否应该跳过该目录"""
        return dirname in self.global_exclude_dirs or dirname in distro_excludes
    
    def extract_version_key(self, distro: str, file_info: Dict) -> Tuple:
        """提取版本分组键，用于识别同一LTS版本的不同子版本"""
        if distro == 'ubuntu':
            # 从 name 中提取: "20.04.6 desktop amd64" -> ("20.04", "desktop", "amd64")
            match = re.match(r'(\d+\.\d+)(?:\.\d+)?\s+(\S+)\s+(\S+)', file_info['name'])
            if match:
                major_version, file_type, arch = match.groups()
                return (major_version, file_type, arch)
        
        elif distro == 'debian':
            # 从 name 中提取: "11.8.0 amd64 debian netinst" -> ("11", "amd64", "debian", "netinst")
            match = re.match(r'(\d+)\.\d+\.\d+\s+(\S+)\s+(.+)', file_info['name'])
            if match:
                major_version, arch, rest = match.groups()
                return (major_version, arch, rest)
        
        elif distro == 'openeuler':
            # 从 name 中提取: "openEuler-22.03-LTS-SP3 x86_64 openEuler Everything"
            # -> ("22.03-LTS", "x86_64", "Everything")
            match = re.match(r'openEuler-([\d\.]+-LTS)(?:-SP\d+)?\s+(\S+)\s+openEuler\s+(.+)', file_info['name'])
            if match:
                lts_version, arch, file_type = match.groups()
                return (lts_version, arch, file_type)
        
        return None
    
    def extract_version_number(self, distro: str, file_info: Dict) -> Tuple:
        """提取完整版本号用于比较（越新越大）"""
        if distro == 'ubuntu':
            # "20.04.6 desktop amd64" -> (20, 4, 6)
            match = re.match(r'(\d+)\.(\d+)(?:\.(\d+))?\s+', file_info['name'])
            if match:
                major, minor, patch = match.groups()
                return (int(major), int(minor), int(patch) if patch else 0)
        
        elif distro == 'debian':
            # "11.8.0 amd64 debian netinst" -> (11, 8, 0)
            match = re.match(r'(\d+)\.(\d+)\.(\d+)\s+', file_info['name'])
            if match:
                return tuple(map(int, match.groups()))
        
        elif distro == 'openeuler':
            # "openEuler-22.03-LTS-SP3" -> (22, 3, 3)
            match = re.match(r'openEuler-([\d\.]+)-LTS(?:-SP(\d+))?', file_info['name'])
            if match:
                version_str, sp = match.groups()
                version_parts = list(map(int, version_str.split('.')))
                sp_num = int(sp) if sp else 0
                return tuple(version_parts + [sp_num])
        
        return (0,)
    
    def filter_latest_versions(self, distro: str, files: List[Dict]) -> List[Dict]:
        """过滤出每个LTS版本的最新镜像"""
        if not files:
            return files
        
        # 按版本分组
        grouped = defaultdict(list)
        ungrouped = []
        
        for file_info in files:
            key = self.extract_version_key(distro, file_info)
            if key:
                grouped[key].append(file_info)
            else:
                ungrouped.append(file_info)
        
        # 每组只保留版本号最大的
        filtered = []
        for key, group in grouped.items():
            if len(group) == 1:
                filtered.append(group[0])
            else:
                # 按版本号排序，取最新的
                latest = max(group, key=lambda f: self.extract_version_number(distro, f))
                filtered.append(latest)
                
                # 输出被过滤掉的版本
                for f in group:
                    if f != latest:
                        print(f"  🔽 过滤旧版本: {f['name']}")
        
        filtered.extend(ungrouped)
        return filtered
    
    def scan_files_optimized(self, distro: str) -> List[Dict]:
        """优化的文件扫描方法"""
        if distro not in self.patterns:
            return []
        
        pattern_info = self.patterns[distro]
        pattern = re.compile(pattern_info['pattern'])
        max_depth = pattern_info.get('max_depth', 10)
        exclude_dirs = pattern_info.get('exclude_dirs', set())
        
        files = []
        scanned_count = 0
        skipped_count = 0
        
        print(f"  🔍 扫描路径: {', '.join(pattern_info['scan_paths'])}")
        
        # 遍历每个指定的扫描路径
        for scan_path in pattern_info['scan_paths']:
            base_path = self.data_dir / scan_path
            
            if not base_path.exists():
                print(f"  ⚠️  路径不存在: {base_path}")
                continue
            
            # 使用 os.walk 进行深度控制的遍历
            base_depth = len(base_path.parts)
            
            for root, dirs, filenames in os.walk(base_path):
                current_depth = len(Path(root).parts) - base_depth
                
                # 深度限制
                if current_depth >= max_depth:
                    dirs.clear()
                    continue
                
                # 过滤要跳过的目录（就地修改 dirs 列表）
                dirs_to_remove = []
                for dirname in dirs:
                    if self.should_skip_dir(dirname, exclude_dirs):
                        dirs_to_remove.append(dirname)
                        skipped_count += 1
                
                for dirname in dirs_to_remove:
                    dirs.remove(dirname)
                
                # 只处理 .iso 文件
                for filename in filenames:
                    if not filename.endswith('.iso'):
                        continue
                    
                    # 跳过 debug 版本（如果不需要的话）
                    if 'debug' in filename.lower() and distro != 'openeuler':
                        continue
                    
                    scanned_count += 1
                    full_path = Path(root) / filename
                    
                    try:
                        rel_path = full_path.relative_to(self.data_dir)
                        rel_path_str = str(rel_path)
                        
                        # 调试输出
                        if distro == 'openeuler':
                            print(f"  🔎 尝试匹配: {rel_path_str}")
                        
                        match = pattern.match(rel_path_str)
                        
                        if match:
                            file_info = self.parse_match(distro, match, rel_path_str)
                            if file_info:
                                files.append(file_info)
                                print(f"  ✓ 找到: {filename}")
                        elif distro == 'openeuler':
                            print(f"  ✗ 不匹配: {rel_path_str}")
                    except ValueError as e:
                        print(f"  ⚠️  处理文件出错: {e}")
                        continue
        
        print(f"  📊 扫描了 {scanned_count} 个 ISO 文件，跳过 {skipped_count} 个目录，找到 {len(files)} 个匹配文件")
        
        # 如果启用了版本过滤
        if pattern_info.get('filter_latest', False):
            print(f"  🔍 应用最新版本过滤...")
            files = self.filter_latest_versions(distro, files)
            print(f"  ✅ 过滤后保留 {len(files)} 个文件")
        
        return files
    
    def parse_match(self, distro: str, match, rel_path: str) -> Dict:
        """解析匹配结果，生成文件信息"""
        groups = match.groups()
        
        if distro == 'ubuntu':
            codename, version, file_type, arch = groups
            return {
                'name': f"{version} {file_type} {arch}",
                'url': f"/ubuntu-releases/{codename}/ubuntu-{version}-{file_type}-{arch}.iso"
            }
        
        elif distro == 'debian':
            version, arch, iso_type, filename = groups
            name_parts = [version, arch]
            if 'live' in rel_path:
                name_parts.append('debian-live')
            if 'edu' in filename:
                name_parts.append('debian-edu')
            else:
                name_parts.append('debian')
            
            for t in ['cinnamon', 'gnome', 'kde', 'lxde', 'lxqt', 'mate', 'xfce', 'standard', 'netinst', 'DVD', 'BD']:
                if t in filename.lower():
                    name_parts.append(t.upper() if t in ['DVD', 'BD'] else t)
                    break
            
            return {
                'name': ' '.join(name_parts),
                'url': f"/{rel_path}"
            }
        
        elif distro == 'rocky':
            major, arch, version, arch2, file_type = groups
            return {
                'name': f"{major}-latest {arch} Rocky {file_type.capitalize()}",
                'url': f"/rocky/{major}/isos/{arch}/Rocky-{major}-latest-{arch}-{file_type}.iso"
            }
        
        elif distro == 'centos':
            version, arch, major, arch2, file_type, date1, date2 = groups
            return {
                'name': f"{version} {arch} centos {file_type.capitalize()}",
                'url': f"/{rel_path}"
            }
        
        elif distro == 'archlinux':
            arch = groups[0]
            return {
                'name': 'latest',
                'url': f"/archlinux/iso/latest/archlinux-{arch}.iso"
            }
        
        elif distro == 'openeuler':
            # groups: (version_dir, arch, version_in_filename, file_type, arch_in_filename)
            version_dir, arch, version_in_filename, file_type, arch_in_filename = groups
            
            # 确定文件类型
            if file_type == 'everything-debug':
                type_name = 'Everything Debug'
            elif file_type == 'everything':
                type_name = 'Everything'
            elif file_type == 'netinst':
                type_name = 'Netins'
            else:
                type_name = 'DVD'
            
            return {
                'name': f"{version_in_filename} {arch_in_filename} openEuler {type_name}",
                'url': f"/{rel_path}"
            }
        
        elif distro == 'kali':
            version, arch = groups
            netinst = '-netinst' if 'netinst' in rel_path else ''
            file_type = 'Netinst' if netinst else 'DVD'
            
            return {
                'name': f"{version} {arch} Kali {file_type}",
                'url': f"/kali-images/current/kali-linux-{version}-installer{netinst}-{arch}.iso"
            }
        
        return None
    
    def update_distro(self, distro: str, dry_run: bool = True) -> Tuple[List, List, List]:
        """更新指定发行版的配置"""
        if distro not in self.config:
            print(f"⚠️  配置中不存在发行版: {distro}")
            return [], [], []
        
        if 'files' not in self.config[distro]:
            print(f"⚠️  {distro} 没有 files 字段，跳过")
            return [], [], []
        
        # 扫描实际文件
        start_time = time.time()
        scanned_files = self.scan_files_optimized(distro)
        elapsed = time.time() - start_time
        print(f"  ⏱️  扫描耗时: {elapsed:.2f} 秒")
        
        old_files = self.config[distro]['files']
        
        # 转换为字典便于比较
        old_dict = {f['url']: f for f in old_files}
        new_dict = {f['url']: f for f in scanned_files}
        
        # 找出新增、删除和保持的文件
        added = [f for url, f in new_dict.items() if url not in old_dict]
        removed = [f for url, f in old_dict.items() if url not in new_dict]
        kept = [f for url, f in new_dict.items() if url in old_dict]
        
        if not dry_run:
            self.config[distro]['files'] = scanned_files
        
        return added, removed, kept
    
    def update_all(self, dry_run: bool = True):
        """更新所有发行版"""
        print(f"{'='*60}")
        print(f"镜像站配置更新工具 - {'测试模式' if dry_run else '实际更新模式'}")
        print(f"{'='*60}\n")
        
        self.load_config()
        
        total_added = 0
        total_removed = 0
        total_time = 0
        
        for distro in self.patterns.keys():
            if distro not in self.config:
                continue
            
            print(f"\n📦 处理: {distro}")
            print(f"{'-'*60}")
            
            start_time = time.time()
            added, removed, kept = self.update_distro(distro, dry_run)
            elapsed = time.time() - start_time
            total_time += elapsed
            
            if added:
                print(f"\n✅ 新增 {len(added)} 个文件:")
                for f in added:
                    print(f"  + {f['name']}")
                    print(f"    {f['url']}")
                total_added += len(added)
            
            if removed:
                print(f"\n❌ 移除 {len(removed)} 个文件:")
                for f in removed:
                    print(f"  - {f['name']}")
                    print(f"    {f['url']}")
                total_removed += len(removed)
            
            if not added and not removed:
                print(f"  ℹ️  无变化 (共 {len(kept)} 个文件)")
        
        print(f"\n{'='*60}")
        print(f"总计: +{total_added} 个新增, -{total_removed} 个移除")
        print(f"总耗时: {total_time:.2f} 秒")
        print(f"{'='*60}\n")
        
        if not dry_run:
            self.save_config()
            print(f"✅ 配置已保存到: {self.config_file}")
        else:
            print(f"ℹ️  测试模式，未修改配置文件")
    
    def save_config(self):
        """保存配置文件"""
        with open(self.config_file, 'w', encoding='utf-8') as f:
            json.dump(self.config, f, ensure_ascii=False, indent=2)
    
    def list_scan_paths(self):
        """列出所有扫描路径（用于调试）"""
        print("配置的扫描路径：\n")
        for distro, info in self.patterns.items():
            print(f"{distro}:")
            for path in info['scan_paths']:
                full_path = self.data_dir / path
                exists = "✓" if full_path.exists() else "✗"
                print(f"  {exists} {full_path}")
            print(f"  最大深度: {info.get('max_depth', 'unlimited')}")
            if info.get('exclude_dirs'):
                print(f"  排除目录: {', '.join(info['exclude_dirs'])}")
            print(f"  正则表达式: {info['pattern']}")
            print(f"  版本过滤: {'启用' if info.get('filter_latest') else '禁用'}")
            print()

def main():
    parser = argparse.ArgumentParser(description='镜像站配置文件自动更新工具（优化版）')
    parser.add_argument('-c', '--config', 
                       default='/opt/convertAPI/local_data.json',
                       help='配置文件路径 (默认: /opt/convertAPI/local_data.json)')
    parser.add_argument('-d', '--data-dir',
                       default='/data',
                       help='镜像数据目录 (默认: /data)')
    parser.add_argument('--apply',
                       action='store_true',
                       help='实际应用更改（默认为测试模式）')
    parser.add_argument('--distro',
                       help='只更新指定的发行版')
    parser.add_argument('--list-paths',
                       action='store_true',
                       help='列出所有扫描路径并退出')
    parser.add_argument('--debug',
                       action='store_true',
                       help='启用调试输出')
    
    args = parser.parse_args()
    
    updater = MirrorUpdater(args.data_dir, args.config)
    
    if args.list_paths:
        updater.list_scan_paths()
        return
    
    if args.distro:
        updater.load_config()
        print(f"只更新发行版: {args.distro}")
        added, removed, kept = updater.update_distro(args.distro, dry_run=not args.apply)
        print(f"\n新增: {len(added)}, 移除: {len(removed)}, 保持: {len(kept)}")
        if args.apply:
            updater.save_config()
    else:
        updater.update_all(dry_run=not args.apply)

if __name__ == '__main__':
    main()
