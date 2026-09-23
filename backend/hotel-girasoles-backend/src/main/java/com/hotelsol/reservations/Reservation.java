
package com.hotelsol.reservations;

import com.hotelsol.rooms.Room;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "reservations")
public class Reservation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "guest_dni", nullable = false, length = 20)
    private String guestDni;

    @Column(name = "guest_name", nullable = false, length = 120)
    private String guestName;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @Column(name = "check_in", nullable = false)
    private LocalDateTime checkIn;

    @Column(name = "estimated_check_out", nullable = false)
    private LocalDateTime estimatedCheckOut;

    @Column(name = "finished_at")
    private LocalDateTime finishedAt;

    @Column(name = "duration_hours", nullable = false)
    private Integer durationHours;

    @Column(name = "room_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal roomPrice;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, length = 20)
    private PaymentMethod paymentMethod;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ReservationStatus status = ReservationStatus.ACTIVA;

    public Reservation() {
    }

    public Long getId() {
        return id;
    }

    public String getGuestDni() {
        return guestDni;
    }

    public void setGuestDni(String guestDni) {
        this.guestDni = guestDni;
    }

    public String getGuestName() {
        return guestName;
    }

    public void setGuestName(String guestName) {
        this.guestName = guestName;
    }

    public Room getRoom() {
        return room;
    }

    public void setRoom(Room room) {
        this.room = room;
    }

    public LocalDateTime getCheckIn() {
        return checkIn;
    }

    public void setCheckIn(LocalDateTime checkIn) {
        this.checkIn = checkIn;
    }

    public LocalDateTime getEstimatedCheckOut() {
        return estimatedCheckOut;
    }

    public void setEstimatedCheckOut(LocalDateTime estimatedCheckOut) {
        this.estimatedCheckOut = estimatedCheckOut;
    }

    public LocalDateTime getFinishedAt() {
        return finishedAt;
    }

    public void setFinishedAt(LocalDateTime finishedAt) {
        this.finishedAt = finishedAt;
    }

    public Integer getDurationHours() {
        return durationHours;
    }

    public void setDurationHours(Integer durationHours) {
        this.durationHours = durationHours;
    }

    public BigDecimal getRoomPrice() {
        return roomPrice;
    }

    public void setRoomPrice(BigDecimal roomPrice) {
        this.roomPrice = roomPrice;
    }

    public PaymentMethod getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(PaymentMethod paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public ReservationStatus getStatus() {
        return status;
    }

    public void setStatus(ReservationStatus status) {
        this.status = status;
    }
}
