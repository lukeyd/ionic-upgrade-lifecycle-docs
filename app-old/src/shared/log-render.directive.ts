import { Directive, Input, OnInit, AfterViewInit } from '@angular/core';
import { log } from './lifecycle-log';

/**
 * Attach as `<ion-content logRender="Home">`. Emits `render` entries so the
 * report can approximate when a page's content view was created and painted.
 */
@Directive({ selector: '[logRender]' })
export class LogRenderDirective implements OnInit, AfterViewInit {
  @Input('logRender') page: string;

  ngOnInit(): void {
    log(this.page, 'render', 'directive:ngOnInit');
  }

  ngAfterViewInit(): void {
    var page = this.page;
    log(page, 'render', 'directive:ngAfterViewInit');
    requestAnimationFrame(function () {
      log(page, 'render', 'rAF-after-viewInit');
    });
  }
}
