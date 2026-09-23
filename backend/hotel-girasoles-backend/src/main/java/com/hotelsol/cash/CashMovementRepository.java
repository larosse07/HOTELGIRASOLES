package com.hotelsol.cash;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface CashMovementRepository extends JpaRepository<CashMovement, Long> {

    List<CashMovement> findByCreatedAtBetweenOrderByCreatedAtAsc(
            LocalDateTime start,
            LocalDateTime end
    );

    List<CashMovement> findByMovementTypeOrderByCreatedAtDesc(
            CashMovementType type
    );
}
