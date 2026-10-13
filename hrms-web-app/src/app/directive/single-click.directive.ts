import {
  Directive,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  Renderer2,
  SimpleChanges
} from '@angular/core';

/**
 * Universal Reusable Directive to prevent double-clicks, display inline loaders,
 * and disable buttons while an action or API request is in progress.
 *
 * Usage examples:
 * 1. Automatic cooldown (2000ms):
 *    <button appSingleClick (click)="save()">Save</button>
 *
 * 2. Custom cooldown duration:
 *    <button [appSingleClick]="1500" (click)="save()">Save</button>
 *
 * 3. Reactive loading state binding:
 *    <button [appSubmitButton]="isSubmitting" (click)="submit()">Submit</button>
 *
 * 4. Dedicated singleClick output event:
 *    <button appSingleClick (singleClick)="onSave()">Save</button>
 */
@Directive({
  selector: '[appSingleClick], [appSubmitButton], [singleClick]',
  standalone: true
})
export class SingleClickDirective implements OnInit, OnChanges, OnDestroy {
  @Input() appSingleClick: boolean | number | string | null = null;
  @Input() appSubmitButton: boolean | number | string | null = null;
  @Input() singleClickTime: number = 2000;
  @Input() loadingText?: string;

  @Output() singleClick = new EventEmitter<MouseEvent>();

  private isLoading = false;
  private timer: any = null;
  private spinnerEl: HTMLElement | null = null;
  private wasOriginallyDisabled = false;

  constructor(
    private el: ElementRef<HTMLButtonElement>,
    private renderer: Renderer2
  ) {}

  ngOnInit() {
    this.wasOriginallyDisabled = this.el.nativeElement.disabled;
    this.syncState();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['appSingleClick'] || changes['appSubmitButton']) {
      this.syncState();
    }
  }

  ngOnDestroy() {
    this.clearTimer();
  }

  private get cooldownTime(): number {
    if (typeof this.appSingleClick === 'number' && this.appSingleClick > 0) {
      return this.appSingleClick;
    }
    if (typeof this.appSubmitButton === 'number' && this.appSubmitButton > 0) {
      return this.appSubmitButton;
    }
    return this.singleClickTime || 2000;
  }

  private syncState() {
    const isBoundBoolean =
      typeof this.appSingleClick === 'boolean' || typeof this.appSubmitButton === 'boolean';
    if (isBoundBoolean) {
      const active = Boolean(this.appSingleClick || this.appSubmitButton);
      this.setLoading(active);
    }
  }

  @HostListener('click', ['$event'])
  handleClick(event: MouseEvent) {
    // If currently loading or disabled, prevent duplicate click and halt propagation
    if (this.isLoading || this.el.nativeElement.disabled) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    // Emit the singleClick output event
    this.singleClick.emit(event);

    // If NOT bound to an external boolean, run automatic cooldown mode
    const isBoundBoolean =
      typeof this.appSingleClick === 'boolean' || typeof this.appSubmitButton === 'boolean';
    if (!isBoundBoolean) {
      this.setLoading(true);
      this.clearTimer();
      this.timer = setTimeout(() => {
        this.setLoading(false);
      }, this.cooldownTime);
    }
  }

  private setLoading(loading: boolean) {
    if (this.isLoading === loading) return;
    this.isLoading = loading;
    const button = this.el.nativeElement;

    if (loading) {
      // 1. Disable the button
      this.renderer.setProperty(button, 'disabled', true);
      this.renderer.addClass(button, 'btn-is-loading');

      // 2. Attach spinner if not already present
      if (!this.spinnerEl) {
        this.spinnerEl = this.renderer.createElement('span');
        this.renderer.addClass(this.spinnerEl, 'spinner-border');
        this.renderer.addClass(this.spinnerEl, 'spinner-border-sm');
        this.renderer.addClass(this.spinnerEl, 'me-2');
        this.renderer.setAttribute(this.spinnerEl, 'role', 'status');
        this.renderer.setAttribute(this.spinnerEl, 'aria-hidden', 'true');
        this.renderer.insertBefore(button, this.spinnerEl, button.firstChild);
      }
    } else {
      // 1. Restore button state
      this.renderer.setProperty(button, 'disabled', this.wasOriginallyDisabled ? true : false);
      this.renderer.removeClass(button, 'btn-is-loading');

      // 2. Remove spinner
      if (this.spinnerEl) {
        this.renderer.removeChild(button, this.spinnerEl);
        this.spinnerEl = null;
      }
    }
  }

  private clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
