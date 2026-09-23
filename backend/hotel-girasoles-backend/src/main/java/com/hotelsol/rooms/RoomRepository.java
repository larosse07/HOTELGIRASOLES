package com.hotelsol.rooms;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RoomRepository extends JpaRepository<Room, Long> {

    Optional<Room> findByRoomNumber(String roomNumber);

    List<Room> findByStatus(RoomStatus status);

    boolean existsByRoomNumber(String roomNumber);
}
