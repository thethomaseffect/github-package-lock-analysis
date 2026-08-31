export async function mapWithConcurrency(items, concurrency, mapper) {
    if (items.length === 0) {
        return [];
    }
    const results = new Array(items.length);
    let nextIndex = 0;
    async function worker() {
        while (nextIndex < items.length) {
            const currentIndex = nextIndex++;
            results[currentIndex] = await mapper(items[currentIndex]);
        }
    }
    const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
    await Promise.all(workers);
    return results;
}
//# sourceMappingURL=concurrency.js.map