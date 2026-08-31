import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import {
  AttrFieldDef,
  getFieldsForElement,
  isHexColor,
  readFieldValue,
} from '../models/attr-schema';
import { SvgDocumentService } from '../svg-document.service';

interface FieldEntry {
  readonly field: AttrFieldDef;
  readonly key: string;
}

@Component({
  selector: 'app-svg-properties-panel',
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  styleUrl: './svg-properties-panel.scss',
  template: `
    <aside class="panel" aria-label="Element properties">
      <header class="panel-header">
        <h2 class="panel-title">Properties</h2>
        @if (selectedSummary(); as summary) {
          <p class="panel-subtitle">{{ summary }}</p>
        } @else {
          <p class="panel-subtitle">Select an element on the canvas to edit its attributes.</p>
        }
      </header>

      @if (fields().length > 0) {
        <div class="panel-form">
          @for (entry of fields(); track entry.key) {
            @switch (entry.field.type) {
              @case ('textarea') {
                <mat-form-field appearance="outline" class="field">
                  <mat-label>{{ entry.field.label }}</mat-label>
                  <textarea
                    matInput
                    rows="4"
                    [attr.aria-label]="entry.field.label"
                    [ngModel]="valueFor(entry.field.name)"
                    (ngModelChange)="onFieldChange(entry.field, $event)"
                  ></textarea>
                </mat-form-field>
              }
              @case ('select') {
                <mat-form-field appearance="outline" class="field">
                  <mat-label>{{ entry.field.label }}</mat-label>
                  <mat-select
                    [attr.aria-label]="entry.field.label"
                    [ngModel]="valueFor(entry.field.name)"
                    (ngModelChange)="onFieldChange(entry.field, $event)"
                  >
                    <mat-option value="">(none)</mat-option>
                    @for (option of entry.field.options ?? []; track option) {
                      <mat-option [value]="option">{{ option }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              }
              @case ('color') {
                <div class="color-field">
                  <mat-form-field appearance="outline" class="field color-input">
                    <mat-label>{{ entry.field.label }}</mat-label>
                    <input
                      matInput
                      [attr.aria-label]="entry.field.label"
                      [ngModel]="valueFor(entry.field.name)"
                      (ngModelChange)="onFieldChange(entry.field, $event)"
                    />
                  </mat-form-field>
                  @if (isHexColor(valueFor(entry.field.name))) {
                    <input
                      class="color-picker"
                      type="color"
                      [attr.aria-label]="entry.field.label + ' picker'"
                      [value]="valueFor(entry.field.name)"
                      (input)="onColorPicker(entry.field, $event)"
                    />
                  }
                </div>
              }
              @case ('number') {
                <mat-form-field appearance="outline" class="field">
                  <mat-label>{{ entry.field.label }}</mat-label>
                  <input
                    matInput
                    type="number"
                    [attr.aria-label]="entry.field.label"
                    [attr.min]="entry.field.min"
                    [attr.max]="entry.field.max"
                    [attr.step]="entry.field.step ?? 1"
                    [ngModel]="valueFor(entry.field.name)"
                    (ngModelChange)="onFieldChange(entry.field, $event)"
                  />
                </mat-form-field>
              }
              @default {
                <mat-form-field appearance="outline" class="field">
                  <mat-label>{{ entry.field.label }}</mat-label>
                  <input
                    matInput
                    [attr.aria-label]="entry.field.label"
                    [ngModel]="valueFor(entry.field.name)"
                    (ngModelChange)="onFieldChange(entry.field, $event)"
                  />
                </mat-form-field>
              }
            }
          }
        </div>
      }
    </aside>
  `,
})
export class SvgPropertiesPanel {
  protected readonly document = inject(SvgDocumentService);
  protected readonly isHexColor = isHexColor;

  private readonly formValues = signal<Record<string, string>>({});

  protected readonly fields = computed((): FieldEntry[] => {
    const element = this.document.selectedElement();
    if (!element) {
      return [];
    }

    const selectionKey = this.document.selectionKey();
    return getFieldsForElement(element).map((field) => ({
      field,
      key: `${selectionKey}:${field.name}`,
    }));
  });

  protected readonly selectedSummary = computed(() => {
    const element = this.document.selectedElement();
    if (!element) {
      return null;
    }

    const tag = element.tagName.toLowerCase();
    const id = element.getAttribute('id');
    return id ? `<${tag}> #${id}` : `<${tag}>`;
  });

  constructor() {
    effect(() => {
      const element = this.document.selectedElement();
      const selectionKey = this.document.selectionKey();
      const elementVersion = this.document.elementVersion();
      void selectionKey;
      void elementVersion;

      if (!element) {
        this.formValues.set({});
        return;
      }

      const values: Record<string, string> = {};
      for (const field of getFieldsForElement(element)) {
        values[field.name] = readFieldValue(element, field.name);
      }

      this.formValues.set(values);
    });
  }

  protected valueFor(fieldName: string): string {
    return this.formValues()[fieldName] ?? '';
  }

  protected onFieldChange(field: AttrFieldDef, value: string | number): void {
    const nextValue = String(value);
    this.formValues.update((current) => ({ ...current, [field.name]: nextValue }));
    this.document.updateAttribute(field.name, nextValue);
  }

  protected onColorPicker(field: AttrFieldDef, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.onFieldChange(field, input.value);
  }
}
