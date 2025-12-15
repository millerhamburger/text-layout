export interface FieldVariable {
  label: string;
  value: any;
}

export interface OrchestratorOptions {
  container: HTMLElement;
  onChange?: (value: string, segments: Array<{ type: 'text' | 'variable'; value: string | FieldVariable }>) => void;
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

  private init() {
    this.editor.className = 'fo-editor';
    this.editor.contentEditable = 'true';
    this.editor.setAttribute('placeholder', this.options.placeholder || '请输入内容...');
    
    // 处理粘贴事件，去除格式
    this.editor.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = e.clipboardData?.getData('text/plain') || '';
      document.execCommand('insertText', false, text);
    });

    this.editor.addEventListener('input', () => {
      this.triggerChange();
    });

    // 确保点击编辑器时聚焦
    this.container.addEventListener('click', (e) => {
      if (e.target === this.container) {
        this.editor.focus();
      }
    });

    this.container.appendChild(this.editor);
  }

  private createVariableNode(variable: FieldVariable): HTMLElement {
    const span = document.createElement('span');
    span.className = 'fo-variable-tag';
    span.contentEditable = 'false'; // 关键：设为不可编辑，作为一个整体
    span.dataset.label = variable.label;
    span.dataset.value = String(variable.value); // Store value in dataset
    span.innerText = variable.label;
    return span;
  }

  /**
   * 插入变量
   * @param variable 变量对象
   */
  public insertVariable(variable: FieldVariable) {
    this.editor.focus();

    // 创建变量标签
    const span = this.createVariableNode(variable);

    // 获取当前光标位置
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      // 如果没有焦点，追加到最后
      this.editor.appendChild(span);
      // 插入一个零宽字符或空格，方便光标移动
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
   * 设置值
   * @param segments 结构化数据
   */
  public setValue(segments: Array<{ type: 'text' | 'variable'; value: string | FieldVariable }>) {
    this.editor.innerHTML = ''; // 清空内容
    segments.forEach(segment => {
      if (segment.type === 'text') {
         this.editor.appendChild(document.createTextNode(String(segment.value)));
      } else if (segment.type === 'variable') {
         const variable = segment.value as FieldVariable;
         const span = this.createVariableNode(variable);
         this.editor.appendChild(span);
      }
    });
    this.triggerChange();
  }

  /**
   * 获取当前值
   */
  public getValue() {
    const segments: Array<{ type: 'text' | 'variable'; value: string | FieldVariable }> = [];
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
        if (element.classList.contains('fo-variable-tag')) {
          const variable: FieldVariable = {
            label: element.dataset.label || '',
            value: element.dataset.value || ''
          };
          segments.push({ type: 'variable', value: variable });
          textContent += `\${${variable.value}}`; // 使用 value 生成文本
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
