import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { AttrFieldDef, getFieldsForElement, isHexColor } from '../models/attr-schema';
import { SvgDocumentService } from '../svg-document.service';

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
          @for (field of fields(); track field.name) {
            @switch (field.type) {
              @case ('textarea') {
                <mat-form-field appearance="outline" class="field">
                  <mat-label>{{ field.label }}</mat-label>
                  <textarea
                    matInput
                    rows="4"
                    [attr.aria-label]="field.label"
                    [ngModel]="valueFor(field.name)"
                    (ngModelChange)="onFieldChange(field, $event)"
                  ></textarea>
                </mat-form-field>
              }
              @case ('select') {
                <mat-form-field appearance="outline" class="field">
                  <mat-label>{{ field.label }}</mat-label>
                  <mat-select
                    [attr.aria-label]="field.label"
                    [ngModel]="valueFor(field.name)"
                    (ngModelChange)="onFieldChange(field, $event)"
                  >
                    <mat-option value="">(none)</mat-option>
                    @for (option of field.options ?? []; track option) {
                      <mat-option [value]="option">{{ option }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              }
              @case ('color') {
                <div class="color-field">
                  <mat-form-field appearance="outline" class="field color-input">
                    <mat-label>{{ field.label }}</mat-label>
                    <input
                      matInput
                      [attr.aria-label]="field.label"
                      [ngModel]="valueFor(field.name)"
                      (ngModelChange)="onFieldChange(field, $event)"
                    />
                  </mat-form-field>
                  @if (isHexColor(valueFor(field.name))) {
                    <input
                      class="color-picker"
                      type="color"
                      [attr.aria-label]="field.label + ' picker'"
                      [value]="valueFor(field.name)"
                      (input)="onColorPicker(field, $event)"
                    />
                  }
                </div>
              }
              @case ('number') {
                <mat-form-field appearance="outline" class="field">
                  <mat-label>{{ field.label }}</mat-label>
                  <input
                    matInput
                    type="number"
                    [attr.aria-label]="field.label"
                    [attr.min]="field.min"
                    [attr.max]="field.max"
                    [attr.step]="field.step ?? 1"
                    [ngModel]="valueFor(field.name)"
                    (ngModelChange)="onFieldChange(field, $event)"
                  />
                </mat-form-field>
              }
              @default {
                <mat-form-field appearance="outline" class="field">
                  <mat-label>{{ field.label }}</mat-label>
                  <input
                    matInput
                    [attr.aria-label]="field.label"
                    [ngModel]="valueFor(field.name)"
                    (ngModelChange)="onFieldChange(field, $event)"
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

  protected readonly fields = computed(() => {
    const element = this.document.selectedElement();
    return element ? getFieldsForElement(element) : [];
  });

  protected readonly selectedSummary = computed(() => {
    const element = this.document.selectedElement();
    if (!element) {
      return null;
    }

    const tag = element.tagName.toLowerCase();
    const id = this.document.selectedAttributes()['id'];
    return id ? `<${tag}> #${id}` : `<${tag}>`;
  });

  protected valueFor(fieldName: string): string {
    return this.document.selectedAttributes()[fieldName] ?? '';
  }

  protected onFieldChange(field: AttrFieldDef, value: string | number): void {
    this.document.updateAttribute(field.name, String(value));
  }

  protected onColorPicker(field: AttrFieldDef, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.onFieldChange(field, input.value);
  }
}
