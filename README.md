# bunnn-text-layout

一个强大的字段编排工具，支持在同一个输入框中混合编辑常量文本和结构化变量（变量、枚举、字典）。支持光标插入、删除整体 Token、获取结构化数据等功能。

## 特性

- 📝 **混合编辑**：支持普通文本与结构化 Token 混合排版。
- 🧩 **多类型支持**：内置支持变量 (Variable)、枚举 (Enum)、字典 (Dictionary)、日期时间 (DateTime)、流水号 (SerialSize) 五种类型。
- 📅 **日期格式**：支持自定义日期时间格式 (如 `YYYY-MM-DD HH:mm:ss`)。
- 🔢 **流水号**：支持定义流水号长度（value 为数值）。
- 🔄 **数据映射**：枚举类型支持 Value 到 Label 的映射关系存储 (如 `{ 1: '男', 2: '女' }`)。
- 💾 **结构化输出**：实时输出结构化的 JSON 数据 (Segments)，便于后端存储和处理。
- ⌨️ **原生体验**：基于 ContentEditable，支持原生光标移动、删除、复制粘贴（自动去除格式）。
- 🎨 **可定制样式**：提供默认 Less 样式，易于覆盖和定制。

## 安装

```bash
npm install bunnn-text-layout
# 或者
yarn add bunnn-text-layout
```

## 基础使用

### 1. 引入样式

在你的入口文件（如 `main.ts` 或 `App.tsx`）中引入 CSS：

```javascript
import 'bunnn-text-layout/dist/index.css';
```

### 2. 初始化编辑器

```typescript
import { FieldOrchestrator } from 'bunnn-text-layout';

const container = document.getElementById('editor-container');

const orchestrator = new FieldOrchestrator({
  container: container,
  placeholder: '请输入内容...',
  allowInput: true, // 可选，默认为 true。设为 false 时禁止用户通过键盘输入文本，只能插入 Token
  onChange: (text, segments) => {
    console.log('当前文本:', text);
    console.log('结构化数据:', segments);
  }
});

// 插入变量
orchestrator.insertToken('variable', { label: '姓名', value: 'name' });

// 插入枚举（带映射）
orchestrator.insertToken('enum', { 
  label: '性别', 
  value: 'gender',
  mapping: { 1: '男', 2: '女' } 
});

// 插入字典（带Code）
orchestrator.insertToken('dictionary', {
  label: '城市',
  value: 'city_id',
  code: 'CITY_DICT'
});

// 插入日期时间
orchestrator.insertToken('dateTimeFormat', {
  label: '创建时间',
  value: 'create_time',
  format: 'YYYY-MM-DD HH:mm:ss'
});

// 插入流水号 (value为长度)
orchestrator.insertToken('serialsize', {
  label: '流水号(6位)',
  value: 6
});
```

## 在 React 中使用

在 React 项目中，建议将其封装为一个组件。

```tsx
import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { FieldOrchestrator, Segment, SegmentType, FieldItem } from 'bunnn-text-layout';
import 'bunnn-text-layout/dist/index.css';

interface TextLayoutEditorProps {
  placeholder?: string;
  initialValue?: Segment[];
  onChange?: (text: string, segments: Segment[]) => void;
}

export interface TextLayoutEditorRef {
  insertToken: (type: SegmentType, item: FieldItem) => void;
  setValue: (segments: Segment[]) => void;
  getValue: () => { text: string; segments: Segment[] };
  clear: () => void;
}

const TextLayoutEditor = forwardRef<TextLayoutEditorRef, TextLayoutEditorProps>((props, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const orchestratorRef = useRef<FieldOrchestrator | null>(null);

  useEffect(() => {
    if (containerRef.current && !orchestratorRef.current) {
      orchestratorRef.current = new FieldOrchestrator({
        container: containerRef.current,
        placeholder: props.placeholder,
        onChange: props.onChange
      });

      // 设置初始值
      if (props.initialValue) {
        orchestratorRef.current.setValue(props.initialValue);
      }
    }
    
    // 清理逻辑
    return () => {
       orchestratorRef.current?.destroy();
       orchestratorRef.current = null;
    };
  }, []); // 仅初始化一次

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    insertToken: (type, item) => {
      orchestratorRef.current?.insertToken(type, item);
    },
    setValue: (segments) => {
      orchestratorRef.current?.setValue(segments);
    },
    getValue: () => {
      return orchestratorRef.current?.getValue() || { text: '', segments: [] };
    },
    clear: () => {
      orchestratorRef.current?.clear();
    }
  }));

  return <div ref={containerRef} style={{ width: '100%' }} />;
});

export default TextLayoutEditor;
```

### 调用示例

```tsx
import React, { useRef } from 'react';
import TextLayoutEditor, { TextLayoutEditorRef } from './TextLayoutEditor';

const App = () => {
  const editorRef = useRef<TextLayoutEditorRef>(null);

  const handleInsert = () => {
    editorRef.current?.insertToken('variable', { label: '订单号', value: 'order_no' });
  };

  const handleLog = () => {
    console.log(editorRef.current?.getValue());
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <button onClick={handleInsert}>插入订单号</button>
        <button onClick={handleLog}>打印值</button>
      </div>
      
      <TextLayoutEditor 
        ref={editorRef}
        placeholder="请点击上方按钮插入字段..."
        onChange={(text, segments) => console.log('Change:', segments)}
      />
    </div>
  );
};
```

## API 参考

### `new FieldOrchestrator(options)`

- `options.container`: `HTMLElement` - 挂载节点
- `options.placeholder`: `string` - 占位符
- `options.onChange`: `(text: string, segments: Segment[]) => void` - 内容变化回调

### 实例方法

- **`insertToken(type: SegmentType, item: FieldItem)`**
  在光标处插入一个 Token。
  - `type`: `'variable' | 'enum' | 'dictionary' | 'dateTimeFormat' | 'serialsize' | 'text'`
  - `item`: `{ label: string, value: any, code?: string, mapping?: Record<string|number, string>, format?: string }`

- **`setValue(segments: Segment[])`**
  设置编辑器的内容。用于回显数据。

- **`getValue()`**
  获取当前内容。
  - 返回: `{ text: string, segments: Segment[] }`

- **`clear()`**
  清空编辑器内容。

- **`destroy()`**
  销毁编辑器实例，移除事件监听并从 DOM 中移除编辑器元素。

### 类型定义

```typescript
type SegmentType = 'text' | 'variable' | 'dictionary' | 'enum' | 'dateTimeFormat' | 'serialsize';

interface FieldItem {
  label: string;
  value: any; // 变量/字典/枚举/日期时间为string，流水号(serialsize)为number
  code?: string; // 字典编码，如 'CITY_DICT'
  mapping?: Record<string | number, string>; // 枚举映射，如 {1: '男', 2: '女'}
  format?: string; // 日期格式，如 'YYYY-MM-DD'
}

interface Segment {
  type: SegmentType;
  value: string | FieldItem;
}
```
