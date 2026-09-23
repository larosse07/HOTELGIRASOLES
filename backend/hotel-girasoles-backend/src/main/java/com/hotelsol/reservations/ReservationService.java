package com.hotelsol.reservations;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import com.hotelsol.cash.CashMovementType;
import com.hotelsol.cash.CashService;
import com.hotelsol.consumptions.Consumption;
import com.hotelsol.consumptions.ConsumptionPaymentStatus;
import com.hotelsol.consumptions.ConsumptionService;
import com.hotelsol.rooms.Room;
import com.hotelsol.rooms.RoomRepository;
import com.hotelsol.rooms.RoomStatus;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReservationService {

        private final ReservationRepository reservationRepository;
        private final RoomRepository roomRepository;
        private final CashService cashService;
        private final ConsumptionService consumptionService;

        public ReservationService(
                        ReservationRepository reservationRepository,
                        RoomRepository roomRepository,
                        CashService cashService,
                        ConsumptionService consumptionService) {
                this.reservationRepository = reservationRepository;
                this.roomRepository = roomRepository;
                this.cashService = cashService;
                this.consumptionService = consumptionService;
        }

        public List<Reservation> findAll() {
                return reservationRepository.findAllByOrderByCheckInDesc();
        }

        public Reservation findById(Long id) {
                return reservationRepository.findById(id)
                                .orElseThrow(() -> new RuntimeException("Reserva no encontrada"));
        }

        public List<Reservation> findByStatus(ReservationStatus status) {
                return reservationRepository.findByStatus(status);
        }

        public List<Reservation> search(String text) {

                List<Reservation> byDni = reservationRepository
                                .findByGuestDniContainingIgnoreCase(text);

                if (!byDni.isEmpty()) {
                        return byDni;
                }

                return reservationRepository
                                .findByGuestNameContainingIgnoreCase(text);
        }

        @Transactional
        public Reservation create(Reservation reservation) {

                if (reservation.getRoom() == null
                                || reservation.getRoom().getId() == null) {

                        throw new RuntimeException(
                                        "Debe seleccionar una habitación");
                }

                Room room = roomRepository
                                .findById(reservation.getRoom().getId())
                                .orElseThrow(() -> new RuntimeException(
                                                "Habitación no encontrada"));

                if (room.getStatus() != RoomStatus.DISPONIBLE) {
                        throw new RuntimeException(
                                        "La habitación no está disponible");
                }

                if (reservation.getGuestDni() == null
                                || reservation.getGuestDni().isBlank()) {

                        throw new RuntimeException(
                                        "El DNI es obligatorio");
                }

                if (reservation.getGuestName() == null
                                || reservation.getGuestName().isBlank()) {

                        throw new RuntimeException(
                                        "El nombre del huésped es obligatorio");
                }

                if (reservation.getDurationHours() == null
                                || reservation.getDurationHours() <= 0) {

                        throw new RuntimeException(
                                        "La duración debe ser mayor a cero");
                }

                if (reservation.getPaymentMethod() == null) {
                        throw new RuntimeException(
                                        "Debe seleccionar un método de pago");
                }

                LocalDateTime checkIn = LocalDateTime.now();

                reservation.setCheckIn(checkIn);

                reservation.setEstimatedCheckOut(
                                checkIn.plusHours(
                                                reservation.getDurationHours()));

                reservation.setFinishedAt(null);

                reservation.setRoom(room);

                if (reservation.getRoomPrice() == null
                                || reservation.getRoomPrice()
                                                .compareTo(BigDecimal.ZERO) <= 0) {

                        reservation.setRoomPrice(room.getPrice());
                }

                reservation.setStatus(
                                ReservationStatus.ACTIVA);

                Reservation saved = reservationRepository.save(reservation);

                room.setStatus(RoomStatus.OCUPADA);
                roomRepository.save(room);

                cashService.register(
                                CashMovementType.RESERVA,
                                saved.getId(),
                                saved.getRoomPrice(),
                                saved.getPaymentMethod(),
                                "Pago de reserva #" + saved.getId());

                return saved;
        }

        @Transactional
        public Reservation finish(Long id) {

                Reservation reservation = findById(id);

                if (reservation.getStatus() != ReservationStatus.ACTIVA) {

                        throw new RuntimeException(
                                        "La reserva no está activa");
                }

                /*
                 * Antes de finalizar la reserva,
                 * cobramos automáticamente todos
                 * los consumos que quedaron pendientes.
                 */
                List<Consumption> consumptions = consumptionService
                                .findByReservation(reservation.getId());

                for (Consumption consumption : consumptions) {

                        if (consumption.getPaymentStatus() == ConsumptionPaymentStatus.SIN_PAGAR) {

                                /*
                                 * Si el consumo no tiene método de pago,
                                 * usamos el mismo método de pago de
                                 * la reserva.
                                 */
                                PaymentMethod paymentMethod = consumption.getPaymentMethod();

                                if (paymentMethod == null) {
                                        paymentMethod = reservation.getPaymentMethod();
                                }

                                consumptionService.pay(
                                                consumption.getId(),
                                                paymentMethod);
                        }
                }

                /*
                 * Guardamos la hora REAL en la que
                 * se finaliza la reserva.
                 */
                reservation.setFinishedAt(
                                LocalDateTime.now());

                /*
                 * La reserva ya terminó.
                 */
                reservation.setStatus(
                                ReservationStatus.FINALIZADA);

                /*
                 * La habitación queda pendiente
                 * de limpieza.
                 */
                Room room = reservation.getRoom();

                room.setStatus(RoomStatus.LIMPIEZA);

                roomRepository.save(room);

                return reservationRepository.save(reservation);
        }

        @Transactional
        public Reservation cancel(Long id) {

                Reservation reservation = findById(id);

                if (reservation.getStatus() != ReservationStatus.ACTIVA) {

                        throw new RuntimeException(
                                        "La reserva no está activa");
                }

                reservation.setStatus(
                                ReservationStatus.CANCELADA);

                Room room = reservation.getRoom();

                room.setStatus(RoomStatus.DISPONIBLE);

                roomRepository.save(room);

                return reservationRepository.save(reservation);
        }
}
