/**
 * WebdriverIO 타입 선언
 */

// WebdriverIO 전역 네임스페이스 선언
declare namespace WebdriverIO {
  interface Element {
    waitForExist(options?: { timeout?: number }): Promise<boolean>;
    waitForDisplayed(options?: { timeout?: number }): Promise<boolean>;
    isExisting(): Promise<boolean>;
    isDisplayed(): Promise<boolean>;
    isEnabled(): Promise<boolean>;
    getText(): Promise<string>;
    getValue(): Promise<string>;
    setValue(value: string): Promise<void>;
    click(): Promise<void>;
    isClickable(): Promise<boolean>;
  }

  interface Workbench {
    getCustomWebview(): Promise<Webview>;
    getTitleBar(): {
      getTitle(): Promise<string>;
    };
  }

  interface Webview {
    waitForVisible(options?: { timeout?: number }): Promise<void>;
    switchToFrame(): Promise<void>;
    switchBack(): Promise<void>;
  }
}

// 브라우저 객체 선언
interface BrowserObject {
  getWorkbench(): Promise<WebdriverIO.Workbench>;
  waitUntil(
    condition: () => Promise<boolean>,
    options?: { timeout?: number; timeoutMsg?: string }
  ): Promise<boolean>;
  pause(ms: number): Promise<void>;
}

// 전역 변수 선언
declare const browser: BrowserObject;
declare function $(selector: string): Promise<WebdriverIO.Element>;
declare function $$(selector: string): Promise<WebdriverIO.Element[]>;

// expect-webdriverio 네임스페이스 선언
declare namespace ExpectWebdriverIO {
  interface Matchers<R> {
    toBeDisplayed(): R;
    toExist(): R;
    toHaveText(text: string): R;
    toHaveValue(value: string): R;
    toBeDefined(): R;
    toBe(value: any): R;
    toBeGreaterThan(value: number): R;
  }
}

// expect 확장
declare namespace jest {
  interface Matchers<R> extends ExpectWebdriverIO.Matchers<R> {}
}

// @wdio/globals 모듈 선언
declare module '@wdio/globals' {
  export const browser: BrowserObject;
  export const $: typeof $;
  export const $$: typeof $$;
  export function expect(value: any): jest.Matchers<void>;
}