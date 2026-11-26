import { describe, expect, it } from "vitest";
import { ColumnWidthStore, StoredWidths } from "../src/domain/ColumnWidthStore";

function storeWith(loaded: unknown) {
	const saved: StoredWidths[] = [];
	const store = new ColumnWidthStore(loaded, async (data) => {
		saved.push(JSON.parse(JSON.stringify(data)));
	});
	return { store, saved };
}

describe("ColumnWidthStore", () => {
	it("keeps widths per note", async () => {
		const { store } = storeWith(null);
		await store.remember("a.md", { X: 60, Y: 40 });
		expect(store.widthsFor("a.md")).toEqual({ X: 60, Y: 40 });
		expect(store.widthsFor("b.md")).toEqual({});
	});

	it("persists every change", async () => {
		const { store, saved } = storeWith(undefined);
		await store.remember("a.md", { X: 100 });
		expect(saved[saved.length - 1]).toEqual({ notes: { "a.md": { X: 100 } } });
	});

	it("follows a renamed note", async () => {
		const { store } = storeWith({ notes: { "a.md": { X: 100 } } });
		await store.move("a.md", "b.md");
		expect(store.widthsFor("a.md")).toEqual({});
		expect(store.widthsFor("b.md")).toEqual({ X: 100 });
	});

	it("forgets the columns of a reset table and drops an empty note", async () => {
		const { store, saved } = storeWith({ notes: { "a.md": { X: 50, Y: 50 } } });
		await store.forget("a.md", ["X", "Y"]);
		expect(saved[saved.length - 1]).toEqual({ notes: {} });
	});

	it("forgets a deleted note", async () => {
		const { store } = storeWith({ notes: { "a.md": { X: 100 } } });
		await store.forgetNote("a.md");
		expect(store.widthsFor("a.md")).toEqual({});
	});
});
