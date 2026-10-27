import { describe, expect, it } from "bun:test";
import { WatchedList } from "../index";

interface Tag {
  id: string;
  label: string;
}

class Tags extends WatchedList<Tag> {
  compareItems(a: Tag, b: Tag): boolean {
    return a.id === b.id;
  }

  static create(initialItems?: Tag[]): Tags {
    return new Tags(initialItems);
  }
}

const fps: Tag = { id: "fps", label: "FPS" };
const clutch: Tag = { id: "clutch", label: "Clutch" };
const funny: Tag = { id: "funny", label: "Funny" };

describe("WatchedList", () => {
  it("tracks an added item as new", () => {
    const tags = Tags.create([fps]);

    tags.add(funny);

    expect(tags.getItems()).toEqual([fps, funny]);
    expect(tags.getNewItems()).toEqual([funny]);
    expect(tags.getRemovedItems()).toEqual([]);
  });

  it("ignores an item it already holds, compared by the list's own rule", () => {
    const tags = Tags.create([fps]);

    tags.add({ id: "fps", label: "Shooter" });
    tags.add(funny);
    tags.add({ ...funny });

    expect(tags.getItems()).toEqual([fps, funny]);
    expect(tags.getNewItems()).toEqual([funny]);
  });

  it("tracks a removed stored item as removed", () => {
    const tags = Tags.create([fps, clutch]);

    tags.remove(fps);

    expect(tags.getItems()).toEqual([clutch]);
    expect(tags.getRemovedItems()).toEqual([fps]);
    expect(tags.getNewItems()).toEqual([]);
  });

  it("leaves no trace of an item added then removed before saving", () => {
    const tags = Tags.create([fps]);

    tags.add(funny);
    tags.remove(funny);

    expect(tags.getItems()).toEqual([fps]);
    expect(tags.hasChanges()).toBe(false);
  });

  it("cancels the removal of a stored item added back", () => {
    const tags = Tags.create([fps, clutch]);

    tags.remove(fps);
    tags.add(fps);

    expect(tags.exists(fps)).toBe(true);
    expect(tags.getRemovedItems()).toEqual([]);
    expect(tags.getNewItems()).toEqual([]);
    expect(tags.hasChanges()).toBe(false);
  });

  it("hands out copies, so a caller cannot change the bookkeeping", () => {
    const tags = Tags.create([fps]);
    tags.add(funny);

    tags.getItems().push(clutch);
    tags.getNewItems().pop();

    expect(tags.getItems()).toEqual([fps, funny]);
    expect(tags.getNewItems()).toEqual([funny]);
  });
});
