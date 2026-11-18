package io.github.ilsic.agenda;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

/** Lines threads up behind one latch, so that they all start within the same instant. */
public final class AtTheSameTime {

  /** What each thread does; it is told which one it is, counting from 1. */
  public interface Attempt<T> {
    T run(int which) throws Exception;
  }

  private AtTheSameTime() {}

  /** Runs the attempt on as many threads as asked and returns the results in thread order. */
  public static <T> List<T> run(int threads, Attempt<T> attempt) throws Exception {
    CountDownLatch everyoneReady = new CountDownLatch(threads);
    CountDownLatch go = new CountDownLatch(1);
    try (ExecutorService pool = Executors.newFixedThreadPool(threads)) {
      List<Future<T>> futures = new ArrayList<>();
      for (int thread = 1; thread <= threads; thread++) {
        int which = thread;
        Callable<T> task =
            () -> {
              everyoneReady.countDown();
              go.await();
              return attempt.run(which);
            };
        futures.add(pool.submit(task));
      }
      everyoneReady.await();
      go.countDown();

      List<T> results = new ArrayList<>();
      for (Future<T> future : futures) {
        results.add(future.get(30, TimeUnit.SECONDS));
      }
      return results;
    }
  }
}
