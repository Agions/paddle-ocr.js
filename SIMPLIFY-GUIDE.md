# paddle-ocr.js 代码简化执行指南

**执行器**: Simplify
**执行日期**: 2026-04-28
**执行策略**: 保护 → 简化 → 验证
**OH-NO 指南**: 谨慎！每步都要验证！

---

## 🎯 简化原则

### 核心原则

1. **保护功能** - 不要改变任何行为
2. **遵守标准** - 匹配项目现有的代码规范
3. **减少复杂度** - 扁平化嵌套,移除冗余
4. **有意命名** - 变量名和函数名要清晰
5. **保证一致** - 保持代码风格统一

### OH-NO 安全规则

- ✅ **小步快跑** - 每次只改一个函数/模块
- ✅ **频繁测试** - 每次改完立即运行测试
- ✅ **及时提交** - 测试通过就提交
- ✅ **回退准备** - 保持标签回退点
- ❌ **不要** - 一次改太多
- ❌ **不要** - 没测试就改下一个
- ❌ **不要** - 改改改不提交

---

## 📋 简化任务清单

### 高优先级 (必须做)

- [ ] **统一的模型加载入口** - 所有识别器使用 ModelLoader
  - 文件: `textDetector.ts`, `textRecognizer.ts`, `tableRecognizer.ts`, `layoutAnalyzer.ts`
  - 预估: 4 × 5分钟 = 20分钟
  - 风险: 🟢 低
  - 收益: ⭐⭐⭐ 大

- [ ] **参数对象化** - 优化函数参数过多
  - 文件: `textRecognizer.ts` (预计)
  - 预估: 15分钟
  - 风险: 🟢 低
  - 收益: ⭐⭐ 中

### 中优先级 (建议做)

- [ ] **移除魔法数字** - 使用命名常量
  - 文件: 多个
  - 预估: 20分钟
  - 风险: 🟢 低
  - 收益: ⭐⭐ 中

- [ ] **简化嵌套条件** - 使用卫语句
  - 文件: 多个
  - 预估: 20分钟
  - 风险: 🟡 中
  - 收益: ⭐⭐ 中

### 低优先级 (可选)

- [ ] **提取重复代码** - 使用辅助函数
- [ ] **统一错误处理** - 使用错误类型
- [ ] **改善命名** - 使用更清晰的名称

---

## 🔧 简化示例

### 示例 1: 统一模型加载

**当前代码** (重复):
```typescript
// src/modules/textDetector.ts
private async initTensorflow(): Promise<void> {
  const modelPath = `${this.options.modelPath}/text/det_DB/model.json`
  this.model = await tf.loadGraphModel(modelPath)
  this.isInitialized = true
}

// src/modules/textRecognizer.ts
private async initTensorflow(): Promise<void> {
  const modelPath = `${this.options.modelPath}/text/rec_CRNN/ch/model.json`
  this.model = await tf.loadGraphModel(modelPath)
  this.isInitialized = true
}
```

**简化后** (统一):
```typescript
// 所有识别器都这样写
async init(): Promise<void> {
  if (this.isInitialized) return
  
  // 使用 ModelLoader 统一加载
  this.model = await this.modelLoader.loadDetectionModel()
  this.isInitialized = true
}
```

**简化步骤**:
```bash
# 1. 修改 textDetector.ts
# 2. 运行测试
npm test
# 3. 如果失败，检查错误，修复
# 4. 如果通过，提交
git add src/modules/textDetector.ts
git commit -m "refactor: use ModelLoader in TextDetector"

# 5. 重复步骤 1-4，处理 textRecognizer.ts
# 6. 重复步骤 1-4，处理 tableRecognizer.ts
# 7. 重复步骤 1-4，处理 layoutAnalyzer.ts
```

---

### 示例 2: 简化嵌套条件

**当前代码** (嵌套深):
```typescript
function processImage(image: ImageData) {
  if (image) {
    if (image.width > 0 && image.height > 0) {
      if (this.options.enableGPU) {
        return this.processWithGPU(image)
      } else {
        if (this.options.enableCaching) {
          const cached = this.cache.get(image)
          if (cached) {
            return cached
          }
        }
        return this.processWithCPU(image)
      }
    }
  }
  throw new Error('Invalid image')
}
```

**简化后** (卫语句):
```typescript
function processImage(image: ImageData): ProcessedImage {
  // 卫语句 - 提前返回
  if (!image) {
    throw new OCRError('Invalid image', ErrorCode.INVALID_INPUT)
  }
  
  if (image.width <= 0 || image.height <= 0) {
    throw new OCRError('Invalid image dimensions', ErrorCode.INVALID_INPUT)
  }
  
  // 检查缓存
  if (this.options.enableCaching) {
    const cached = this.cache.get(image)
    if (cached) {
      return cached
    }
  }
  
  // 主逻辑
  if (this.options.enableGPU) {
    return this.processWithGPU(image)
  }
  
  return this.processWithCPU(image)
}
```

**简化收益**:
- ✅ 减少嵌套层级
- ✅ 更容易阅读
- ✅ 更容易测试

---

### 示例 3: 使用命名常量

**当前代码** (魔法数字):
```typescript
function adjustImageSize(image: ImageData): ImageData {
  if (image.width > 4096) {
    return resize(image, 1024)
  }
  
  if (image.height > 2160) {
    return resize(image, 720)
  }
  
  return image
}
```

**简化后** (命名常量):
```typescript
const DEFAULT_IMAGE_SIZES = {
  MAX_WIDTH: 4096,
  MAX_HEIGHT: 2160,
  DEFAULT_WIDTH: 1024,
  DEFAULT_HEIGHT: 720,
} as const

function adjustImageSize(image: ImageData): ImageData {
  if (image.width > DEFAULT_IMAGE_SIZES.MAX_WIDTH) {
    return resize(image, DEFAULT_IMAGE_SIZES.DEFAULT_WIDTH)
  }
  
  if (image.height > DEFAULT_IMAGE_SIZES.MAX_HEIGHT) {
    return resize(image, DEFAULT_IMAGE_SIZES.DEFAULT_HEIGHT)
  }
  
  return image
}
```

**简化收益**:
- ✅ 更易维护
- ✅ 一致性
- ✅ 易于修改

---

## 🚀 OH-NO 执行步骤

### 步骤 0: 准备工作

```bash
# 1. 确保当前状态干净
git status
# 应该显示: On branch main, 跟踪 64a595b

# 2. 运行基础测试 - 确保他们通过
npm test
# 应该显示: 20 tests passed

# 3. 运行 TypeScript 检查
npx tsc --noEmit
# 应该显示: 0 errors

# 4. 创建简化分支
git checkout -b refactor/simplify-code
git branch
# 应该显示你现在的分支
```

---

### 步骤 1: 高优先级任务 - 统一模型加载

```bash
# 1.1 修改 textDetector.ts
# 打开文件: src/modules/textDetector.ts
# 找到: initTensorflow() 或 init() 方法
# 改为: 使用 this.modelLoader.loadDetectionModel()

# 保存文件
# 运行测试
npm test

# 如果测试失败:
#   - 查看错误信息
#   - 检查 ModelLoader 的 API
#   - 修复代码
#   - 重新测试
#   - 重复直到通过

# 如果测试通过:
#   - 提交这个小改动
git add src/modules/textDetector.ts
git commit -m "refactor: TextDetector uses ModelLoader"
git log --oneline -1
# 应该看到你的提交
```

```bash
# 1.2 对 textRecognizer.ts 重复同样的步骤
# 1.3 对 tableRecognizer.ts 重复同样的步骤
# 1.4 对 layoutAnalyzer.ts 重复同样的步骤

# 验证所有修改
npm test
# 应该: 20/20 tests passed

git log --oneline
# 应该看到 4 个提交
```

---

### 步骤 2: 中优先级任务 - 参数对象化

```bash
# 2.1 找到参数过多的函数
npx tsc --noEmit
grep -r "function.*(.*) {" src/ | grep -v "this."

# 2.2 选择最简单的函数,重构为参数对象
# 2.3 运行测试验证
npm test

# 2.4 提交
git commit -m "refactor: use parameter object for XXX()"
```

---

### 步骤 3: 持续改进

```bash
# 按照优先级列表,逐个完成任务
# 每做完一个,立即测试,立即提交

# 定期检查状态
git status
npm test
npx tsc --noEmit
```

---

### 步骤 4: 最终验证

```bash
# 4.1 运行所有测试
npm test
# 应该: 20/20 tests passed (0 failures)

# 4.2 运行linting
npm run lint
# 应该: 0 errors

# 4.3 统计代码行数
npx cloc src/ --exclude-dir=__tests__
# 查看简化前后变化

# 4.4 提交所有改动
git add .
git commit -m "refactor: complete code simplification

- Standardized model loading with ModelLoader
- Added named constants for magic numbers
- Simplified nested conditions with guard clauses
- Improved function parameter objects"

# 4.5 创建合并请求
git checkout main
git merge refactor/simplify-code
git push origin main
```

---

## 📊 简化验证矩阵

每次修改后填写:

| 文件 | 修改前 | 修改后 | 测试状态 | 提交SHA |
|------|--------|--------|---------|--------|
| textDetector.ts | ?? lines | ?? lines | ✅/❌ | ???... |
| textRecognizer.ts | ?? lines | ?? lines | ✅/❌ | ???... |
| tableRecognizer.ts | ?? lines | ?? lines | ✅/❌ | ???... |
| layoutAnalyzer.ts | ?? lines | ?? lines | ✅/❌ | ???... |
| ... | ?? lines | ?? lines | ✅/❌ | ???... |

---

## ⚠️ OH-NO 警告

### 常见错误 🔴

1. **一次改太多**
   - 症状: 修改了多个文件,测试失败,不知道哪里出错
   - 修复: 立即回退 `git reset --hard origin/main`
   - 预防: 每次只改一个函数,测试通过才继续

2. **没有运行测试**
   - 症状: 改了代码,忘了测试,提交后才发现问题
   - 修复: 找到失败的提交,回退 `git revert HEAD`
   - 预防: 每次改完立即运行 `npm test`

3. **改变了行为**
   - 症状: 测试通过了,但用户抱怨功能不对
   - 修复: 找到失败的提交,检查 diff,修复或回退
   - 预防: 使用 `git diff` 查看改了什么,确保只是重构

### 应急方案 🚨

```bash
# 立即停止,保存进度
git stash save "work in progress"

# 回退到干净状态
git checkout main

# 检查当前状态
git status
npm test

# 恢复工作
git stash pop
```

```bash
# 完全重置
git reset --hard origin/main
git clean -fd
npm install
npm test
```

---

## 📈 简化成功指标

完成后检查:

- [x] 所有测试通过 (20/20)
- [x] TypeScript 编译通过 (0 errors)
- [x] Linting 通过 (0 errors)
- [x] 最大文件行数减少
- [x] 重复代码减少
- [x] 循环复杂度降低
- [x] 代码可读性提升

---

## 🎯 最终目标

简化完成后的 paddle-ocr.js 应该:

✅ **代码行数**: 总行数减少 10%
✅ **最大文件**: < 500 行
✅ **重复代码**: < 50 行
✅ **测试覆盖率**: > 50%
✅ **TypeScript 错误**: 0
✅ **ESLint 警告**: < 50
✅ **循环复杂度**: 平均 < 10

---

**文档生成**: Simplify
**完整流程**: ✅ 完成
**OH-NO 建议**: 哦不！这只是指南,你需要一步步执行啊！记住小步快跑,每一步都要测试！如果出问题了,立即回退啊！
