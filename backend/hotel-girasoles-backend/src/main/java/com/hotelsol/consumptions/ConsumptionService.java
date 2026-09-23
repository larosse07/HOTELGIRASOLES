package com.hotelsol.consumptions;

import com.hotelsol.cash.CashMovementType;
import com.hotelsol.cash.CashService;
import com.hotelsol.products.Product;
import com.hotelsol.products.ProductRepository;
import com.hotelsol.reservations.PaymentMethod;
import com.hotelsol.reservations.Reservation;
import com.hotelsol.reservations.ReservationRepository;
import com.hotelsol.reservations.ReservationStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class ConsumptionService {

    private final ConsumptionRepository consumptionRepository;
    private final ReservationRepository reservationRepository;
    private final ProductRepository productRepository;
    private final CashService cashService;

    public ConsumptionService(
            ConsumptionRepository consumptionRepository,
            ReservationRepository reservationRepository,
            ProductRepository productRepository,
            CashService cashService
    ) {
        this.consumptionRepository = consumptionRepository;
        this.reservationRepository = reservationRepository;
        this.productRepository = productRepository;
        this.cashService = cashService;
    }

    public List<Consumption> findAll() {
        return consumptionRepository.findAll();
    }

    public Consumption findById(Long id) {
        return consumptionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Consumo no encontrado"));
    }

    public List<Consumption> findByReservation(Long reservationId) {
        return consumptionRepository
                .findByReservationIdOrderByCreatedAtDesc(reservationId);
    }

    @Transactional
    public Consumption create(Consumption consumption) {

        if (consumption.getReservation() == null
                || consumption.getReservation().getId() == null) {
            throw new RuntimeException("Debe seleccionar una reserva");
        }

        Reservation reservation = reservationRepository
                .findById(consumption.getReservation().getId())
                .orElseThrow(() -> new RuntimeException("Reserva no encontrada"));

        if (reservation.getStatus() != ReservationStatus.ACTIVA) {
            throw new RuntimeException("La reserva no está activa");
        }

        if (consumption.getItems() == null || consumption.getItems().isEmpty()) {
            throw new RuntimeException("Debe agregar productos al consumo");
        }

        if (consumption.getPaymentStatus() == null) {
            throw new RuntimeException("Debe indicar si el consumo está pagado");
        }

        if (consumption.getPaymentStatus() == ConsumptionPaymentStatus.PAGADO
                && consumption.getPaymentMethod() == null) {
            throw new RuntimeException("Debe seleccionar el método de pago");
        }

        BigDecimal total = BigDecimal.ZERO;

        for (ConsumptionItem item : consumption.getItems()) {

            if (item.getProduct() == null || item.getProduct().getId() == null) {
                throw new RuntimeException("Producto inválido");
            }

            if (item.getQuantity() == null || item.getQuantity() <= 0) {
                throw new RuntimeException("La cantidad debe ser mayor a cero");
            }

            Product product = productRepository
                    .findById(item.getProduct().getId())
                    .orElseThrow(() -> new RuntimeException("Producto no encontrado"));

            if (product.getStock() < item.getQuantity()) {
                throw new RuntimeException(
                        "Stock insuficiente para: " + product.getName()
                );
            }

            item.setConsumption(consumption);
            item.setProduct(product);
            item.setUnitPrice(product.getPrice());

            BigDecimal subtotal = product.getPrice()
                    .multiply(BigDecimal.valueOf(item.getQuantity()));

            item.setSubtotal(subtotal);

            product.setStock(product.getStock() - item.getQuantity());
            productRepository.save(product);

            total = total.add(subtotal);
        }

        consumption.setReservation(reservation);
        consumption.setTotal(total);

        Consumption saved = consumptionRepository.save(consumption);

        if (saved.getPaymentStatus() == ConsumptionPaymentStatus.PAGADO) {
            cashService.register(
                    CashMovementType.CONSUMO,
                    saved.getId(),
                    saved.getTotal(),
                    saved.getPaymentMethod(),
                    "Pago de consumo #" + saved.getId()
            );
        }

        return saved;
    }

    @Transactional
    public Consumption pay(
            Long id,
            PaymentMethod paymentMethod
    ) {

        Consumption consumption = findById(id);

        if (consumption.getPaymentStatus() == ConsumptionPaymentStatus.PAGADO) {
            throw new RuntimeException("El consumo ya está pagado");
        }

        if (paymentMethod == null) {
            throw new RuntimeException("Debe indicar el método de pago");
        }

        consumption.setPaymentStatus(ConsumptionPaymentStatus.PAGADO);
        consumption.setPaymentMethod(paymentMethod);

        Consumption saved = consumptionRepository.save(consumption);

        cashService.register(
                CashMovementType.CONSUMO,
                saved.getId(),
                saved.getTotal(),
                paymentMethod,
                "Pago pendiente de consumo #" + saved.getId()
        );

        return saved;
    }
}
