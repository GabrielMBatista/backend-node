type Task = () => Promise<void>;

class LocalQueue {
  private queue: Task[] = [];
  private isProcessing = false;

  enqueue(task: Task) {
    this.queue.push(task);
    this.process();
  }

  private async process() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (!task) continue;

      try {
        await task();
      } catch (err) {
        console.error("[Fila local] Erro ao processar tarefa:", err);
      }
    }

    this.isProcessing = false;
  }
}

export const evaluationQueue = new LocalQueue();
