// 测试环境基础设置：注入 jest-dom 自定义匹配器
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { expect } from '@rstest/core';

expect.extend(jestDomMatchers);
