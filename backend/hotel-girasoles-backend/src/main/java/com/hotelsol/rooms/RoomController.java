package com.hotelsol.rooms;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/rooms")
@CrossOrigin(origins = "*")
public class RoomController {

    private final RoomService roomService;

    public RoomController(RoomService roomService) {
        this.roomService = roomService;
    }

    @GetMapping
    public List<Room> findAll() {
        return roomService.findAll();
    }

    @GetMapping("/{id}")
    public Room findById(@PathVariable Long id) {
        return roomService.findById(id);
    }

    @GetMapping("/status/{status}")
    public List<Room> findByStatus(@PathVariable RoomStatus status) {
        return roomService.findByStatus(status);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Room create(@RequestBody Room room) {
        return roomService.create(room);
    }

    @PutMapping("/{id}")
    public Room update(@PathVariable Long id, @RequestBody Room room) {
        return roomService.update(id, room);
    }

    @PatchMapping("/{id}/status")
    public Room changeStatus(
            @PathVariable Long id,
            @RequestParam RoomStatus status
    ) {
        return roomService.changeStatus(id, status);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        roomService.delete(id);
    }
}
