package io.github.ilsic.agenda.notification;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/staff/notifications")
@Tag(name = "Notifications", description = "E-mails produced from booking events")
class NotificationController {

  private final SentEmailRepository emails;

  NotificationController(SentEmailRepository emails) {
    this.emails = emails;
  }

  @GetMapping
  @Operation(summary = "List the latest 50 e-mails sent to patients, newest first")
  List<Notification> latest() {
    return emails.findTop50ByOrderBySentAtDescIdDesc().stream().map(Notification::of).toList();
  }
}
