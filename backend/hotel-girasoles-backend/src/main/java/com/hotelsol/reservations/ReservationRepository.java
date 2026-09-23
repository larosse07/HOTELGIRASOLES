package com.hotelsol.reservations;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReservationRepository extends JpaRepository<Reservation, Long> {

    List<Reservation> findAllByOrderByCheckInDesc();

    List<Reservation> findByStatus(ReservationStatus status);

    List<Reservation> findByGuestDniContainingIgnoreCase(String dni);

    List<Reservation> findByGuestNameContainingIgnoreCase(String name);

    boolean existsByRoom_IdAndStatus(
            Long roomId,
            ReservationStatus status
    );
}