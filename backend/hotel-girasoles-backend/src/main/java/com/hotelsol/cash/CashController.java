package com.hotelsol.cash;

import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/cash")
@CrossOrigin(origins = "*")
public class CashController {

    private final CashService cashService;

    public CashController(CashService cashService) {
        this.cashService = cashService;
    }

    @GetMapping
    public List<CashMovement> findAll() {
        return cashService.findAll();
    }

    @GetMapping("/date/{date}")
    public List<CashMovement> findByDate(@PathVariable LocalDate date) {
        return cashService.findByDate(date);
    }

    @GetMapping("/date/{date}/total")
    public BigDecimal totalForDate(@PathVariable LocalDate date) {
        return cashService.totalForDate(date);
    }
}
