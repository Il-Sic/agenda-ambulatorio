package io.github.ilsic.agenda.booking;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/waiting-room")
@Tag(name = "Waiting room", description = "The screen that calls patients by number")
class WaitingRoomController {

  private final WaitingRoom waitingRoom;

  WaitingRoomController(WaitingRoom waitingRoom) {
    this.waitingRoom = waitingRoom;
  }

  @GetMapping("/calls")
  @Operation(
      summary = "Today's latest calls, the latest first",
      description =
          "At most five. Numbers and rooms only: the screen is public and never shows a name."
              + " Meant to be asked every few seconds.")
  List<WaitingRoomCall> calls() {
    return waitingRoom.latestCalls();
  }
}
