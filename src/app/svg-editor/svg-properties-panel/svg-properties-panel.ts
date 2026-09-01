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
  templateUrl: './svg-properties-panel.html',
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
