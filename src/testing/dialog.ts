import { Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

/** Monta um diálogo como componente comum, com os dados e um `close` espionado. */
export async function renderDialog<T>(
  component: Type<T>,
  data: unknown,
): Promise<{ fixture: ComponentFixture<T>; root: HTMLElement; close: ReturnType<typeof vi.fn> }> {
  const close = vi.fn();
  TestBed.overrideProvider(MAT_DIALOG_DATA, { useValue: data });
  TestBed.overrideProvider(MatDialogRef, { useValue: { close } });
  const fixture = TestBed.createComponent(component);
  await fixture.whenStable();
  return { fixture, root: fixture.nativeElement as HTMLElement, close };
}

export function typeInto(root: HTMLElement, selector: string, value: string): void {
  const field = root.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
  field.value = value;
  field.dispatchEvent(new Event('input'));
}
