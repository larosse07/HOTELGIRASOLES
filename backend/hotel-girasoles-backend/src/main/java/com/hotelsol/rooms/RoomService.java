package com.hotelsol.rooms;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class RoomService {

    private final RoomRepository roomRepository;

    public RoomService(RoomRepository roomRepository) {
        this.roomRepository = roomRepository;
    }

    public List<Room> findAll() {
        return roomRepository.findAll();
    }

    public Room findById(Long id) {
        return roomRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Habitación no encontrada"));
    }

    public List<Room> findByStatus(RoomStatus status) {
        return roomRepository.findByStatus(status);
    }

    @Transactional
    public Room create(Room room) {

        if (roomRepository.existsByRoomNumber(room.getRoomNumber())) {
            throw new RuntimeException("El número de habitación ya existe");
        }

        if (room.getStatus() == null) {
            room.setStatus(RoomStatus.DISPONIBLE);
        }

        return roomRepository.save(room);
    }

    @Transactional
    public Room update(Long id, Room data) {

        Room room = findById(id);

        if (!room.getRoomNumber().equals(data.getRoomNumber())
                && roomRepository.existsByRoomNumber(data.getRoomNumber())) {

            throw new RuntimeException(
                    "El número de habitación ya existe");
        }

        room.setRoomNumber(data.getRoomNumber());
        room.setType(data.getType());
        room.setPrice(data.getPrice());
        room.setNightPrice(data.getNightPrice());
        room.setDescription(data.getDescription());

        if (data.getStatus() != null) {
            room.setStatus(data.getStatus());
        }

        return roomRepository.save(room);
    }

    @Transactional
    public void delete(Long id) {

        Room room = findById(id);

        if (room.getStatus() == RoomStatus.OCUPADA) {
            throw new RuntimeException(
                    "No se puede eliminar una habitación ocupada");
        }

        roomRepository.delete(room);
    }

    @Transactional
    public Room changeStatus(Long id, RoomStatus status) {

        Room room = findById(id);

        room.setStatus(status);

        return roomRepository.save(room);
    }
}