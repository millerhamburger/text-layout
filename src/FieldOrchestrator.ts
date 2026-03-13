export interface FieldItem {
  label: string;
  value: any;
  code?: string;
  mapping?: Record<string | number, string>;
  format?: string;
}

export type SegmentType = 'text' | 'variable' | 'dictionary' | 'enum' | 'dateTimeFormat' | 'serialsize';

export interface Segment {
  type: SegmentType;
  value: string | FieldItem;
}

export interface OrchestratorOptions {
  container: HTMLElement;
  onChange?: (value: string, segments: Array<Segment>) => void;
  placeholder?: string;
  allowInput?: boolean; // 是否允许手动输入，默认true
}

export class FieldOrchestrator {
  private container: HTMLElement;
  private editor: HTMLDivElement;
  private options: OrchestratorOptions;
  private lastRange: Range | null = null;
  private allowInput: boolean;

  constructor(options: OrchestratorOptions) {
    this.options = options;
    this.container = options.container;
    this.editor = document.createElement('div');
    this.allowInput = options.allowInput !== false; // 默认为true
    this.init();
  }

  private handlePaste = (e: ClipboardEvent) => {
    e.preventDefault();
    if (!this.allowInput) return;
    const text = e.clipboardData?.getData('text/plain') || '';
    document.execCommand('insertText', false, text);
  };

  private handleBeforeInput = (e: InputEvent) => {
    if (!this.allowInput) {
        // 禁止输入的类型
        const blockedTypes = [
            'insertText',
            'insertCompositionText',
            'insertFromPaste',
            'insertFromDrop',
            'insertReplacementText',
            'insertParagraph',
            'insertLineBreak'
        ];
        if (blockedTypes.includes(e.inputType)) {
            e.preventDefault();
        }
    }
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.allowInput) {
        // 允许的功能键：删除、光标移动、全选/复制/粘贴
        const allowedKeys = [
            'Backspace', 'Delete', 
            'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 
            'Home', 'End', 'PageUp', 'PageDown',
            'Tab', 'Escape'
        ];
        
        // 允许组合键 (Ctrl/Cmd + key)
        if (e.ctrlKey || e.metaKey) {
            return;
        }

        // 如果不是允许的键，且是单字符输入或Enter，则阻止
        if (!allowedKeys.includes(e.key)) {
             e.preventDefault();
        }
    }
  };

  private handleInput = () => {
    this.triggerChange();
  };

  private handleContainerClick = (e: MouseEvent) => {
    if (e.target === this.container) {
      this.editor.focus();
    }
  };

  private init() {
    this.editor.className = 'fo-editor';
    this.editor.contentEditable = 'true';
    this.editor.setAttribute('placeholder', this.options.placeholder || '请输入内容...');
    
    // 处理粘贴事件，去除格式
    this.editor.addEventListener('paste', this.handlePaste);

    // 处理输入前事件，用于拦截
    this.editor.addEventListener('beforeinput', this.handleBeforeInput);

    // 处理键盘按下事件，阻止输入
    this.editor.addEventListener('keydown', this.handleKeyDown);

    this.editor.addEventListener('input', this.handleInput);

    // 确保点击编辑器时聚焦
    this.container.addEventListener('click', this.handleContainerClick);

    this.container.appendChild(this.editor);
    
    // 监听选区变化，记录最后的光标位置
    document.addEventListener('selectionchange', this.handleSelectionChange);
  }

  private handleSelectionChange = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      // 只记录在编辑器内的光标位置
      if (this.editor.contains(range.commonAncestorContainer)) {
        this.lastRange = range.cloneRange();
      }
    }
  };

  /**
   * 销毁实例，清理事件监听和DOM
   */
  public destroy() {
    this.editor.removeEventListener('paste', this.handlePaste);
    this.editor.removeEventListener('beforeinput', this.handleBeforeInput);
    this.editor.removeEventListener('keydown', this.handleKeyDown);
    this.editor.removeEventListener('input', this.handleInput);
    this.container.removeEventListener('click', this.handleContainerClick);
    document.removeEventListener('selectionchange', this.handleSelectionChange);
    
    if (this.editor.parentNode === this.container) {
      this.container.removeChild(this.editor);
    }
  }

  private createTokenNode(type: SegmentType, item: FieldItem): HTMLElement {
    const span = document.createElement('span');
    span.className = `fo-tag fo-tag-${type}`;
    span.contentEditable = 'false'; // 关键：设为不可编辑，作为一个整体
    span.dataset.type = type;
    span.dataset.label = item.label;
    span.dataset.value = String(item.value); // Store value in dataset
    if (item.code) {
      span.dataset.code = item.code;
    }
    if (item.mapping) {
      span.dataset.mapping = JSON.stringify(item.mapping);
    }
    if (item.format) {
      span.dataset.format = item.format;
    }
    span.innerText = item.label;
    return span;
  }

  /**
   * 插入Token (变量/字典/枚举)
   * @param type 类型
   * @param item 数据对象
   */
  public insertToken(type: SegmentType, item: FieldItem) {
    if (type === 'text') return; // 文本通过输入插入

    // 先获取选区，判断焦点位置
    const selection = window.getSelection();
    let range = (selection && selection.rangeCount > 0) ? selection.getRangeAt(0) : null;
    let isInside = range && this.editor.contains(range.commonAncestorContainer);

    // 如果当前没有焦点或焦点不在编辑器内，尝试使用最后记录的光标位置
    if (!isInside && this.lastRange && this.editor.contains(this.lastRange.commonAncestorContainer)) {
        range = this.lastRange;
        isInside = true;
    }

    this.editor.focus();

    // 恢复选区到计算出的 range
    if (isInside && range && selection) {
        selection.removeAllRanges();
        selection.addRange(range);
    }

    // 创建标签
    const span = this.createTokenNode(type, item);

    if (!isInside) {
      // 如果没有焦点且没有历史记录，追加到最后
      this.editor.appendChild(span);
      
      // 移动光标到最后
      range = document.createRange();
      range.selectNodeContents(this.editor);
      range.collapse(false);
    } else if (range) {
      // 在光标处插入
      range.deleteContents();
      range.insertNode(span);
      
      // 插入后将光标移动到标签后面
      range.setStartAfter(span);
      range.setEndAfter(span);
    }

    // 恢复/设置光标
    if (range) {
        const newSelection = window.getSelection();
        if (newSelection) {
            newSelection.removeAllRanges();
            newSelection.addRange(range);
            // 更新最后光标位置
            this.lastRange = range.cloneRange();
        }
    }

    this.triggerChange();
  }

  /**
   * 兼容旧API: 插入变量
   */
  public insertVariable(variable: FieldItem) {
      this.insertToken('variable', variable);
  }

  /**
   * 设置值
   * @param segments 结构化数据
   */
  public setValue(segments: Array<Segment>) {
    this.editor.innerHTML = ''; // 清空内容
    this.lastRange = null; // 重置光标位置记录
    segments.forEach(segment => {
      if (segment.type === 'text') {
         this.editor.appendChild(document.createTextNode(String(segment.value)));
      } else {
         const item = segment.value as FieldItem;
         const span = this.createTokenNode(segment.type, item);
         this.editor.appendChild(span);
      }
    });
    this.triggerChange();
  }

  /**
   * 获取当前值
   */
  public getValue() {
    const segments: Array<Segment> = [];
    let textContent = '';

    this.editor.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        if (text) {
          segments.push({ type: 'text', value: text });
          textContent += text;
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        if (element.classList.contains('fo-tag')) {
          const type = (element.dataset.type as SegmentType) || 'variable';
          let itemValue: any = element.dataset.value || '';
          
          // 如果是流水号，尝试转为数字
          if (type === 'serialsize') {
             const num = Number(itemValue);
             if (!isNaN(num)) {
                 itemValue = num;
             }
          }

          const item: FieldItem = {
            label: element.dataset.label || '',
            value: itemValue
          };
          if (element.dataset.code) {
             item.code = element.dataset.code;
          }
          if (element.dataset.format) {
             item.format = element.dataset.format;
          }
          if (element.dataset.mapping) {
             try {
                 item.mapping = JSON.parse(element.dataset.mapping);
             } catch (e) {
                 console.error('Failed to parse mapping', e);
             }
          }
          segments.push({ type, value: item });
          textContent += `\${${item.value}}`; // 简化的文本表示，暂不区分类型前缀
        } else {
            // 处理可能的其他标签（如换行div），视为换行或文本
            if (element.tagName === 'DIV' || element.tagName === 'P' || element.tagName === 'BR') {
                 segments.push({ type: 'text', value: '\n' });
                 textContent += '\n';
            } else {
                 const text = element.innerText || '';
                 if(text) {
                     segments.push({ type: 'text', value: text });
                     textContent += text;
                 }
            }
        }
      }
    });

    return {
      text: textContent,
      segments
    };
  }
  
  public clear() {
      this.editor.innerHTML = '';
      this.lastRange = null;
      this.triggerChange();
  }

  private triggerChange() {
    if (this.options.onChange) {
      const result = this.getValue();
      this.options.onChange(result.text, result.segments);
    }
  }
}
