import { ColumnLayout } from "../domain/ColumnLayout";
import type { ColumnWidthStore } from "../domain/ColumnWidthStore";

export type NoteResolver = (element: HTMLElement) => string | undefined;

export class TableResizer {
	static readonly TABLE = "table.table-view-table";
	static readonly HANDLE_CLASS = "dataview-column-width-handle";
	static readonly RESIZED_CLASS = "dataview-column-width-resized";
	static readonly DRAGGING_CLASS = "dataview-column-width-dragging";
	private static readonly SCAN_DELAY_MS = 30;
	private static readonly APPLIED_KEY = "dataviewColumnWidthHeaders";
	private static readonly RESULT_COUNT = ".small-text";

	private readonly observers: MutationObserver[] = [];
	private readonly docs: Document[] = [];
	private readonly scheduled = new WeakSet<Document>();

	constructor(private readonly store: ColumnWidthStore, private readonly resolveNote: NoteResolver) {}

	watch(doc: Document): void {
		const observer = new MutationObserver(() => this.scheduleScan(doc));
		observer.observe(doc.body, { childList: true, characterData: true, subtree: true });
		this.observers.push(observer);
		this.docs.push(doc);
		this.scan(doc);
	}

	dispose(): void {
		this.observers.forEach((observer) => observer.disconnect());
		this.observers.length = 0;
		this.docs.forEach((doc) => {
			doc.querySelectorAll(`.${TableResizer.HANDLE_CLASS}`).forEach((handle) => handle.remove());
			doc.querySelectorAll<HTMLTableElement>(TableResizer.TABLE).forEach((table) => {
				this.clear(table);
				delete table.dataset[TableResizer.APPLIED_KEY];
			});
		});
		this.docs.length = 0;
	}

	private scheduleScan(doc: Document): void {
		if (this.scheduled.has(doc)) return;
		this.scheduled.add(doc);
		doc.defaultView?.setTimeout(() => {
			this.scheduled.delete(doc);
			this.scan(doc);
		}, TableResizer.SCAN_DELAY_MS);
	}

	private scan(doc: Document): void {
		doc.querySelectorAll<HTMLTableElement>(TableResizer.TABLE).forEach((table) => {
			const cells = TableResizer.headerCells(table);
			if (cells.length === 0) return;
			const headers = TableResizer.headers(table);
			if (headers.every((header) => header === "")) return;
			const signature = headers.join("\n");
			if (table.dataset[TableResizer.APPLIED_KEY] === signature && TableResizer.hasHandles(cells)) return;
			const notePath = this.resolveNote(table);
			if (!notePath) return;
			table.dataset[TableResizer.APPLIED_KEY] = signature;
			this.applyStored(table, notePath);
			cells.forEach((cell, border) => {
				if (!cell.querySelector(`:scope > .${TableResizer.HANDLE_CLASS}`)) cell.appendChild(this.createHandle(table, border));
			});
		});
	}

	private applyToNote(notePath: string): void {
		this.docs.forEach((doc) =>
			doc.querySelectorAll<HTMLTableElement>(TableResizer.TABLE).forEach((table) => {
				if (this.resolveNote(table) === notePath) this.applyStored(table, notePath);
			}),
		);
	}

	private applyStored(table: HTMLTableElement, notePath: string): void {
		const headers = TableResizer.headers(table);
		const percents = ColumnLayout.percentsFor(headers, this.store.widthsFor(notePath));
		if (percents) this.setPercents(table, percents);
		else this.clear(table);
	}

	private createHandle(table: HTMLTableElement, border: number): HTMLElement {
		const handle = table.doc.createElement("div");
		handle.addClass(TableResizer.HANDLE_CLASS);
		["click", "mousedown"].forEach((type) =>
			handle.addEventListener(type, (event) => {
				event.preventDefault();
				event.stopPropagation();
			}),
		);
		handle.addEventListener("pointerdown", (event) => this.startDrag(event, table, border, handle));
		handle.addEventListener("dblclick", (event) => {
			event.preventDefault();
			event.stopPropagation();
			void this.reset(table);
		});
		return handle;
	}

	private startDrag(event: PointerEvent, table: HTMLTableElement, border: number, handle: HTMLElement): void {
		if (event.button !== 0) return;
		event.preventDefault();
		event.stopPropagation();
		const notePath = this.resolveNote(table);
		if (!notePath) return;

		const headers = TableResizer.headers(table);
		const percents = TableResizer.appliedPercents(table) ?? ColumnLayout.shares(TableResizer.measure(table));
		this.setPercents(table, percents);
		const start = TableResizer.measure(table);
		const container = (ColumnLayout.sum(start) * ColumnLayout.FULL) / ColumnLayout.sum(percents);
		const startX = event.clientX;
		let widths = start;

		handle.setPointerCapture(event.pointerId);
		table.doc.body.addClass(TableResizer.DRAGGING_CLASS);
		handle.addClass("is-dragging");

		const move = (moveEvent: PointerEvent): void => {
			widths = ColumnLayout.moveBorder(start, border, moveEvent.clientX - startX, container);
			this.setPercents(table, ColumnLayout.percentsOf(widths, container));
		};
		const finish = (): void => {
			handle.removeEventListener("pointermove", move);
			handle.removeEventListener("pointerup", finish);
			handle.removeEventListener("pointercancel", finish);
			table.doc.body.removeClass(TableResizer.DRAGGING_CLASS);
			handle.removeClass("is-dragging");
			void this.store
				.remember(notePath, ColumnLayout.toPercents(headers, widths, container))
				.then(() => this.applyToNote(notePath));
		};
		handle.addEventListener("pointermove", move);
		handle.addEventListener("pointerup", finish);
		handle.addEventListener("pointercancel", finish);
	}

	private async reset(table: HTMLTableElement): Promise<void> {
		const notePath = this.resolveNote(table);
		if (!notePath) return;
		await this.store.forget(notePath, TableResizer.headers(table));
		this.applyToNote(notePath);
	}

	private setPercents(table: HTMLTableElement, percents: number[]): void {
		table.addClass(TableResizer.RESIZED_CLASS);
		table.style.width = `${Math.min(ColumnLayout.sum(percents), ColumnLayout.FULL)}%`;
		TableResizer.headerCells(table).forEach((cell, index) => {
			cell.style.width = `${percents[index] ?? 0}%`;
		});
	}

	private clear(table: HTMLTableElement): void {
		table.removeClass(TableResizer.RESIZED_CLASS);
		table.style.removeProperty("width");
		TableResizer.headerCells(table).forEach((cell) => cell.style.removeProperty("width"));
	}

	private static headerCells(table: HTMLTableElement): HTMLTableCellElement[] {
		return Array.from(table.querySelectorAll<HTMLTableCellElement>(":scope > thead > tr > th"));
	}

	private static appliedPercents(table: HTMLTableElement): number[] | null {
		if (!table.hasClass(TableResizer.RESIZED_CLASS)) return null;
		const percents = TableResizer.headerCells(table).map((cell) => parseFloat(cell.style.width));
		return percents.every((value) => value > 0) ? percents : null;
	}

	private static measure(table: HTMLTableElement): number[] {
		return TableResizer.headerCells(table).map((cell) => cell.getBoundingClientRect().width);
	}

	private static hasHandles(cells: HTMLTableCellElement[]): boolean {
		return cells.every((cell) => cell.querySelector(`:scope > .${TableResizer.HANDLE_CLASS}`) !== null);
	}

	static headers(table: HTMLTableElement): string[] {
		return TableResizer.headerCells(table).map((cell) => {
			const copy = cell.cloneNode(true) as HTMLElement;
			copy.querySelectorAll(`${TableResizer.RESULT_COUNT}, .${TableResizer.HANDLE_CLASS}`).forEach((node) => node.remove());
			return (copy.textContent ?? "").trim();
		});
	}
}
