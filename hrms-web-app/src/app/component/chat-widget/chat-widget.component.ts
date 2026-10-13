import {
  Component,
  inject,
  ElementRef,
  ViewChild,
  AfterViewChecked
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { ChatService, ChatMessage, ChatDraft } from '../../services/chat/chat.service';

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-widget.component.html',
  styleUrl: './chat-widget.component.scss'
})
export class ChatWidgetComponent implements AfterViewChecked {
  private chatService = inject(ChatService);
  private toastr = inject(ToastrService);

  @ViewChild('scrollContainer') private scrollContainer?: ElementRef;

  isOpen = false;
  userInput = '';
  isLoading = false;
  confirmingIndex: number | null = null;
  private shouldScroll = false;

  suggestedQuestions: string[] = [
    'What is my current leave balance?',
    'Show my latest payslip summary',
    'What are the upcoming holidays?',
    'Show pending team requests for approval',
    'Help me apply for Casual Leave'
  ];

  messages: ChatMessage[] = [
    {
      role: 'assistant',
      content:
        'Hello! 👋 I am your AI HR Assistant. I can help you check leave balances, view payslips & CTC breakdowns, clarify company policies, or prepare leave and attendance regularization requests. How can I help you today?',
      timestamp: new Date()
    }
  ];

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  toggleChat(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.shouldScroll = true;
    }
  }

  closeChat(): void {
    this.isOpen = false;
  }

  clearChat(): void {
    this.messages = [
      {
        role: 'assistant',
        content:
          'Conversation reset. Feel free to ask anything about your leaves, payroll, attendance, or company policies!',
        timestamp: new Date()
      }
    ];
  }

  useSuggestion(text: string): void {
    this.userInput = text;
    this.sendMessage();
  }

  sendMessage(): void {
    const text = this.userInput?.trim();
    if (!text || this.isLoading) return;

    this.messages.push({
      role: 'user',
      content: text,
      timestamp: new Date()
    });

    this.userInput = '';
    this.isLoading = true;
    this.shouldScroll = true;

    // Build payload for backend (only user & assistant textual roles)
    const historyPayload = this.messages.map(m => ({
      role: m.role,
      content: m.content
    }));

    this.chatService.sendMessage(historyPayload).subscribe({
      next: res => {
        this.isLoading = false;
        this.messages.push({
          role: 'assistant',
          content: res.reply || (res.draft ? 'Here is the draft for your review:' : 'Done.'),
          draft: res.draft,
          status: res.draft ? 'pending' : undefined,
          timestamp: new Date()
        });
        this.shouldScroll = true;
      },
      error: err => {
        this.isLoading = false;
        const errMsg =
          err?.error?.message ||
          err?.error ||
          'Sorry, I encountered an error connecting to the HR assistant service.';
        this.messages.push({
          role: 'assistant',
          content: `⚠️ ${typeof errMsg === 'string' ? errMsg : 'Something went wrong. Please try again.'}`,
          timestamp: new Date()
        });
        this.shouldScroll = true;
      }
    });
  }

  confirmDraft(message: ChatMessage, index: number): void {
    if (!message.draft || message.status !== 'pending') return;

    this.confirmingIndex = index;
    const draft = message.draft;

    this.chatService.confirmDraft(draft.confirmEndpoint, draft.payload).subscribe({
      next: res => {
        this.confirmingIndex = null;
        message.status = 'confirmed';
        this.toastr.success(
          `${draft.actionType === 'leave' ? 'Leave application' : 'Attendance regularization'} submitted successfully!`,
          'Success'
        );
        this.messages.push({
          role: 'assistant',
          content: `✅ Your ${draft.actionType} request has been confirmed and submitted for manager approval.`,
          timestamp: new Date()
        });
        this.shouldScroll = true;
      },
      error: err => {
        this.confirmingIndex = null;
        const msg =
          err?.error?.message ||
          (typeof err?.error === 'string' ? err.error : 'Failed to submit request.');
        this.toastr.error(msg, 'Submission Failed');
      }
    });
  }

  cancelDraft(message: ChatMessage): void {
    message.status = 'cancelled';
    this.messages.push({
      role: 'assistant',
      content: 'Draft cancelled. Let me know if you would like to prepare a different request.',
      timestamp: new Date()
    });
    this.shouldScroll = true;
  }

  private scrollToBottom(): void {
    try {
      if (this.scrollContainer) {
        this.scrollContainer.nativeElement.scrollTop =
          this.scrollContainer.nativeElement.scrollHeight;
      }
    } catch {}
  }
}
