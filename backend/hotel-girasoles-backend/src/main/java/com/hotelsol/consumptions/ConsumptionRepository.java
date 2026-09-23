package com.hotelsol.consumptions;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ConsumptionRepository extends JpaRepository<Consumption, Long> {

    List<Consumption> findByReservationIdOrderByCreatedAtDesc(Long reservationId);
}
