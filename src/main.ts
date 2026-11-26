import { MarkdownView, Plugin, TFile } from "obsidian";
import { ColumnWidthStore } from "./domain/ColumnWidthStore";
import { TableResizer } from "./infrastructure/TableResizer";

export default class DataviewColumnWidthPlugin extends Plugin {
	private resizer!: TableResizer;

	override async onload(): Promise<void> {
		const store = new ColumnWidthStore(await this.loadData(), (data) => this.saveData(data));
		this.resizer = new TableResizer(store, (element) => this.notePathOf(element));

		this.app.workspace.onLayoutReady(() => this.resizer.watch(document));
		this.registerEvent(this.app.workspace.on("window-open", (win) => this.resizer.watch(win.doc)));
		this.registerEvent(this.app.vault.on("rename", (file, oldPath) => void store.move(oldPath, file.path)));
		this.registerEvent(this.app.vault.on("delete", (file) => void store.forgetNote(file.path)));
	}

	override onunload(): void {
		this.resizer.dispose();
	}

	private notePathOf(element: HTMLElement): string | undefined {
		const hostPath = this.viewContaining(element)?.file?.path;
		if (!hostPath) return undefined;
		const embed = element.closest<HTMLElement>(".internal-embed[src]");
		if (!embed) return hostPath;
		const linkpath = (embed.getAttribute("src") ?? "").split("#")[0]!;
		const target = linkpath ? this.app.metadataCache.getFirstLinkpathDest(linkpath, hostPath) : null;
		return target instanceof TFile ? target.path : hostPath;
	}

	private viewContaining(element: HTMLElement): MarkdownView | undefined {
		let found: MarkdownView | undefined;
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (leaf.view instanceof MarkdownView && leaf.view.containerEl.contains(element)) found = leaf.view;
		});
		return found;
	}
}
