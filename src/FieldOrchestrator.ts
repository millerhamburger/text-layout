export interface FieldItem {
  label: string;
  value: any;
  code?: string;
  mapping?: Record<string | number, string>;
}

export type SegmentType = 'text' | 'variable' | 'dictionary' | 'enum';

export interface Segment {
  type: SegmentType;
  value: string | FieldItem;
}

export interface OrchestratorOptions {
  container: HTMLElement;
  onChange?: (value: string, segments: Array<Segment>) => void;
  placeholder?: string;
}

export class FieldOrchestrator {
  private container: HTMLElement;
  private editor: HTMLDivElement;
  private options: OrchestratorOptions;

  constructor(options: OrchestratorOptions) {
    this.options = options;
    this.container = options.container;
    this.editor = document.createElement('div');
    this.init();
  }

  private handlePaste = (e: ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData?.getData('text/plain') || '';
    document.execCommand('insertText', false, text);
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

    this.editor.addEventListener('input', this.handleInput);

    // 确保点击编辑器时聚焦
    this.container.addEventListener('click', this.handleContainerClick);

    this.container.appendChild(this.editor);
  }

  /**
   * 销毁实例，清理事件监听和DOM
   */
  public destroy() {
    this.editor.removeEventListener('paste', this.handlePaste);
    this.editor.removeEventListener('input', this.handleInput);
    this.container.removeEventListener('click', this.handleContainerClick);
    
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

    this.editor.focus();

    // 创建标签
    const span = this.createTokenNode(type, item);

    // 获取当前光标位置
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      // 如果没有焦点，追加到最后
      this.editor.appendChild(span);
      this.editor.appendChild(document.createTextNode('\u00A0')); 
    } else {
      const range = selection.getRangeAt(0);
      
      // 检查光标是否在编辑器内
      if (!this.editor.contains(range.commonAncestorContainer)) {
         this.editor.appendChild(span);
         this.editor.appendChild(document.createTextNode('\u00A0'));
      } else {
        range.deleteContents();
        range.insertNode(span);
        
        // 插入后将光标移动到标签后面
        range.setStartAfter(span);
        range.setEndAfter(span);
        
        // 插入一个空格，防止在标签内输入
        const space = document.createTextNode('\u00A0');
        range.insertNode(space);
        range.setStartAfter(space);
        range.setEndAfter(space);
        
        selection.removeAllRanges();
        selection.addRange(range);
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
          const item: FieldItem = {
            label: element.dataset.label || '',
            value: element.dataset.value || ''
          };
          if (element.dataset.code) {
             item.code = element.dataset.code;
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
      this.triggerChange();
  }

  private triggerChange() {
    if (this.options.onChange) {
      const result = this.getValue();
      this.options.onChange(result.text, result.segments);
    }
  }
}
