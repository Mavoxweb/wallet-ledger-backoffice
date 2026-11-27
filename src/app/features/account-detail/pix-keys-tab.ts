import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PixKeyResponse, PixKeyType } from '../../api';
import { DayPipe } from '../../shared/money.pipe';

const TYPE_LABELS: Record<PixKeyType, string> = {
  email: 'E-mail',
  phone: 'Celular',
  evp: 'Aleatória',
};

@Component({
  selector: 'wl-pix-keys-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DayPipe],
  template: `
    @if (keys().length === 0) {
      <p class="empty">Esta conta não tem chaves Pix.</p>
    } @else {
      <ul>
        @for (key of keys(); track key.id) {
          <li>
            <div class="key">
              <span class="type">{{ typeLabel(key.type) }}</span>
              <span class="num value">{{ key.value }}</span>
            </div>
            <span class="date">Criada em {{ key.createdAt | day }}</span>
          </li>
        }
      </ul>
    }
  `,
  styleUrl: './pix-keys-tab.scss',
})
export class PixKeysTab {
  readonly keys = input.required<PixKeyResponse[]>();

  protected typeLabel(type: PixKeyType): string {
    return TYPE_LABELS[type];
  }
}
