/*
 * @Author: YEYI millerye1995@foxmail.com
 * @Date: 2025-12-15 14:58:18
 * @LastEditors: YEYI millerye1995@foxmail.com
 * @LastEditTime: 2025-12-15 14:59:06
 * @FilePath: \text-layout\src\index.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import './style.less';

export const hello = (name: string): string => {
  return `Hello, ${name}!`;
};

export class TextLayout {
  constructor(private element: HTMLElement) {}

  render(text: string) {
    this.element.innerHTML = `<div class="my-component">${text}</div>`;
  }
}
