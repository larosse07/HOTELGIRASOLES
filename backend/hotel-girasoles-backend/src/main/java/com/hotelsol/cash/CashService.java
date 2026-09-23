package com.hotelsol.cash;

import com.hotelsol.reservations.PaymentMethod;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Service
public class CashService {

    private final CashMovementRepository cashMovementRepository;

    public CashService(CashMovementRepository cashMovementRepository) {
        this.cashMovementRepository = cashMovementRepository;
    }

    public List<CashMovement> findAll() {
        return cashMovementRepository.findAll();
    }

    public List<CashMovement> findByDate(LocalDate date) {
        LocalDateTime start = date.atStartOfDay();
        LocalDateTime end = date.atTime(LocalTime.MAX);

        return cashMovementRepository
                .findByCreatedAtBetweenOrderByCreatedAtAsc(start, end);
    }

    public BigDecimal totalForDate(LocalDate date) {
        return findByDate(date)
                .stream()
                .map(CashMovement::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public CashMovement register(
            CashMovementType type,
            Long referenceId,
            BigDecimal amount,
            PaymentMethod paymentMethod,
            String description
    ) {
        CashMovement movement = new CashMovement();
        movement.setMovementType(type);
        movement.setReferenceId(referenceId);
        movement.setAmount(amount);
        movement.setPaymentMethod(paymentMethod);
        movement.setDescription(description);

        return cashMovementRepository.save(movement);
    }
}
