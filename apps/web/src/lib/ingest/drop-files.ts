const ACCEPT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function isAcceptedImage(file: File): boolean {
  if (ACCEPT_TYPES.has(file.type)) {
    return true;
  }
  return /\.(jpe?g|png|webp)$/i.test(file.name);
}

export function fileQueueKey(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

type DropEntry = {
  isFile: boolean;
  isDirectory: boolean;
  file: (ok: (file: File) => void, err?: (error: Error) => void) => void;
  createReader: () => {
    readEntries: (
      ok: (entries: DropEntry[]) => void,
      err?: (error: Error) => void,
    ) => void;
  };
};

function asEntry(item: DataTransferItem): DropEntry | null {
  const getter = (
    item as DataTransferItem & {
      webkitGetAsEntry?: () => DropEntry | null;
    }
  ).webkitGetAsEntry;
  return getter ? getter.call(item) : null;
}

async function readDirectory(entry: DropEntry): Promise<File[]> {
  const reader = entry.createReader();
  const files: File[] = [];
  for (;;) {
    const batch = await new Promise<DropEntry[]>((resolve, reject) => {
      reader.readEntries(resolve, (error) => reject(error));
    });
    if (batch.length === 0) {
      break;
    }
    for (const child of batch) {
      files.push(...(await walkDropEntry(child)));
    }
  }
  return files;
}

async function walkDropEntry(entry: DropEntry): Promise<File[]> {
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) => {
      entry.file(resolve, (error) => reject(error));
    });
    return [file];
  }
  if (entry.isDirectory) {
    return readDirectory(entry);
  }
  return [];
}

/** Folder drops become a flat file list. */
export async function filesFromDrop(event: {
  dataTransfer: DataTransfer | null;
}): Promise<File[]> {
  const transfer = event.dataTransfer;
  if (!transfer) {
    return [];
  }
  const files: File[] = [];
  let usedEntry = false;
  for (const item of [...transfer.items]) {
    const entry = asEntry(item);
    if (entry) {
      usedEntry = true;
      files.push(...(await walkDropEntry(entry)));
      continue;
    }
    const file = item.getAsFile();
    if (file) {
      files.push(file);
    }
  }
  if (!usedEntry) {
    return [...transfer.files];
  }
  return files;
}
