export type ColumnWidths = Record<string, number>;

export interface StoredWidths {
	notes: Record<string, ColumnWidths>;
}

export type Persist = (data: StoredWidths) => Promise<void>;

export class ColumnWidthStore {
	private readonly data: StoredWidths;

	constructor(loaded: unknown, private readonly persist: Persist) {
		this.data = ColumnWidthStore.normalize(loaded);
	}

	widthsFor(notePath: string): ColumnWidths {
		return { ...(this.data.notes[notePath] ?? {}) };
	}

	async remember(notePath: string, widths: ColumnWidths): Promise<void> {
		this.data.notes[notePath] = { ...(this.data.notes[notePath] ?? {}), ...widths };
		await this.persist(this.data);
	}

	async forget(notePath: string, columns: string[]): Promise<void> {
		const widths = this.data.notes[notePath];
		if (!widths) return;
		columns.forEach((column) => delete widths[column]);
		if (Object.keys(widths).length === 0) delete this.data.notes[notePath];
		await this.persist(this.data);
	}

	async forgetNote(notePath: string): Promise<void> {
		if (!(notePath in this.data.notes)) return;
		delete this.data.notes[notePath];
		await this.persist(this.data);
	}

	async move(oldPath: string, newPath: string): Promise<void> {
		const widths = this.data.notes[oldPath];
		if (!widths) return;
		delete this.data.notes[oldPath];
		this.data.notes[newPath] = widths;
		await this.persist(this.data);
	}

	private static normalize(loaded: unknown): StoredWidths {
		const notes = (loaded as Partial<StoredWidths> | null)?.notes;
		return { notes: notes && typeof notes === "object" ? { ...notes } : {} };
	}
}
