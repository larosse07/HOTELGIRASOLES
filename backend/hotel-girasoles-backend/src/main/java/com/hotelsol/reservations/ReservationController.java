package com.hotelsol.reservations;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reservations")
@CrossOrigin(origins = "*")
public class ReservationController {

    private final ReservationService reservationService;

    public ReservationController(ReservationService reservationService) {
        this.reservationService = reservationService;
    }

    @GetMapping
    public List<Reservation> findAll() {
        return reservationService.findAll();
    }

    @GetMapping("/{id}")
    public Reservation findById(@PathVariable Long id) {
        return reservationService.findById(id);
    }

    @GetMapping("/status/{status}")
    public List<Reservation> findByStatus(
            @PathVariable ReservationStatus status
    ) {
        return reservationService.findByStatus(status);
    }

    @GetMapping("/search")
    public List<Reservation> search(@RequestParam String q) {
        return reservationService.search(q);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Reservation create(@RequestBody Reservation reservation) {
        return reservationService.create(reservation);
    }

    @PatchMapping("/{id}/finish")
    public Reservation finish(@PathVariable Long id) {
        return reservationService.finish(id);
    }

    @PatchMapping("/{id}/cancel")
    public Reservation cancel(@PathVariable Long id) {
        return reservationService.cancel(id);
    }
}
