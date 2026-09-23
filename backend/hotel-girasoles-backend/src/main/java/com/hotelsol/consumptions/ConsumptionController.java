package com.hotelsol.consumptions;

import com.hotelsol.reservations.PaymentMethod;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/consumptions")
@CrossOrigin(origins = "*")
public class ConsumptionController {

    private final ConsumptionService consumptionService;

    public ConsumptionController(ConsumptionService consumptionService) {
        this.consumptionService = consumptionService;
    }

    @GetMapping
    public List<Consumption> findAll() {
        return consumptionService.findAll();
    }

    @GetMapping("/{id}")
    public Consumption findById(@PathVariable Long id) {
        return consumptionService.findById(id);
    }

    @GetMapping("/reservation/{reservationId}")
    public List<Consumption> findByReservation(
            @PathVariable Long reservationId
    ) {
        return consumptionService.findByReservation(reservationId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Consumption create(
            @RequestBody Consumption consumption
    ) {
        return consumptionService.create(consumption);
    }

    @PatchMapping("/{id}/pay")
    public Consumption pay(
            @PathVariable Long id,
            @RequestParam PaymentMethod paymentMethod
    ) {
        return consumptionService.pay(id, paymentMethod);
    }
}
