import { CommonModule } from '@angular/common';
import {
    ChangeDetectorRef,
    Component,
    OnInit,
    inject
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
    Room,
    RoomStatus
} from '../../core/models/hotel.models';

import { RoomService } from '../../core/services/room.service';

@Component({
    selector: 'app-admin-rooms',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule
    ],
    templateUrl: './admin-room.html',
    styleUrl: './admin-room.css'
})
export class AdminRoomsComponent implements OnInit {

    private readonly roomService = inject(RoomService);

    private readonly cdr = inject(ChangeDetectorRef);

    rooms: Room[] = [];

    searchTerm = '';

    selectedStatus: 'TODAS' | RoomStatus = 'TODAS';

    showRoomModal = false;

    editingRoom: Room | null = null;

    roomForm = {
        roomNumber: '',
        type: '',
        price: 0,
        nightPrice: 0,
        description: '',
        status: 'DISPONIBLE' as RoomStatus
    };

    showDeleteModal = false;

    selectedRoom: Room | null = null;

    saving = false;

    loading = false;

    error = '';

    success = '';

    showSavedNotification = false;

    private savedNotificationTimer: ReturnType<typeof setTimeout> | null = null;

    ngOnInit(): void {
        this.loadRooms();
    }

    loadRooms(): void {

        this.loading = true;

        this.error = '';

        this.roomService.getAll().subscribe({

            next: rooms => {

                console.log(
                    'Habitaciones recibidas:',
                    rooms
                );

                this.rooms = Array.isArray(rooms)
                    ? rooms
                    : [];

                this.loading = false;

                this.cdr.detectChanges();
            },

            error: error => {

                console.error(
                    'Error cargando habitaciones:',
                    error
                );

                this.rooms = [];

                this.loading = false;

                if (
                    error?.status === 401 ||
                    error?.status === 403
                ) {

                    this.error =
                        'No tienes permisos para consultar las habitaciones.';

                } else if (error?.status === 0) {

                    this.error =
                        'No se pudo conectar con el servidor.';

                } else {

                    this.error =
                        'No se pudieron cargar las habitaciones.';
                }

                this.cdr.detectChanges();
            }
        });
    }

    get filteredRooms(): Room[] {

        const search =
            this.searchTerm
                .trim()
                .toLowerCase();

        return this.rooms.filter(room => {

            const matchesStatus =
                this.selectedStatus === 'TODAS' ||
                room.status === this.selectedStatus;

            if (!matchesStatus) {
                return false;
            }

            if (!search) {
                return true;
            }

            const roomNumber =
                String(room.roomNumber ?? '')
                    .toLowerCase();

            const type =
                String(room.type ?? '')
                    .toLowerCase();

            const description =
                String(room.description ?? '')
                    .toLowerCase();

            return (
                roomNumber.includes(search) ||
                type.includes(search) ||
                description.includes(search)
            );
        });
    }

    get totalRooms(): number {
        return this.rooms.length;
    }

    get availableRooms(): number {
        return this.rooms.filter(
            room =>
                room.status === 'DISPONIBLE'
        ).length;
    }

    get occupiedRooms(): number {
        return this.rooms.filter(
            room =>
                room.status === 'OCUPADA'
        ).length;
    }

    get cleaningRooms(): number {
        return this.rooms.filter(
            room =>
                room.status === 'LIMPIEZA'
        ).length;
    }

    isInternalRoom(
        roomNumber: string | null | undefined
    ): boolean {

        return String(roomNumber ?? '')
            .trim()
            .toUpperCase()
            .endsWith('A');
    }

    isInternalFormRoom(): boolean {

        return this.isInternalRoom(
            this.roomForm.roomNumber
        );
    }

    get roomNumberExists(): boolean {

        const value =
            this.roomForm.roomNumber
                .trim()
                .toLowerCase();

        if (!value) {
            return false;
        }

        return this.rooms.some(room => {

            const sameNumber =
                String(room.roomNumber ?? '')
                    .trim()
                    .toLowerCase() === value;

            if (!sameNumber) {
                return false;
            }

            if (!this.editingRoom) {
                return true;
            }

            return Number(room.id) !== Number(this.editingRoom.id);
        });
    }

    setStatusFilter(
        status: 'TODAS' | RoomStatus
    ): void {
        this.selectedStatus = status;
    }

    openCreateRoom(): void {

        this.clearMessages();

        this.editingRoom = null;

        this.roomForm = {
            roomNumber: '',
            type: '',
            price: 0,
            nightPrice: 0,
            description: '',
            status: 'DISPONIBLE'
        };

        this.showRoomModal = true;
    }

    openEditRoom(room: Room): void {

        this.clearMessages();

        this.editingRoom = room;

        const internalRoom =
            this.isInternalRoom(
                room.roomNumber
            );

        this.roomForm = {
            roomNumber:
                String(room.roomNumber ?? ''),

            type:
                String(room.type ?? ''),

            price:
                internalRoom
                    ? 0
                    : Number(room.price ?? 0),

            nightPrice:
                internalRoom
                    ? 0
                    : Number(room.nightPrice ?? 0),

            description:
                String(room.description ?? ''),

            status:
                room.status ?? 'DISPONIBLE'
        };

        this.showRoomModal = true;
    }

    closeRoomModal(): void {

        if (this.saving) {
            return;
        }

        this.showRoomModal = false;

        this.editingRoom = null;
    }

    saveRoom(): void {

        this.clearMessages();

        const roomNumber =
            this.roomForm.roomNumber.trim();

        const type =
            this.roomForm.type.trim();

        const internalRoom =
            this.isInternalRoom(roomNumber);

        const price =
            internalRoom
                ? 0
                : Number(this.roomForm.price);

        const nightPrice =
            internalRoom
                ? 0
                : Number(this.roomForm.nightPrice);

        const description =
            this.roomForm.description.trim();

        const status =
            this.roomForm.status;

        if (!roomNumber) {

            this.error =
                'Ingresa el número de habitación.';

            return;
        }

        if (this.roomNumberExists) {

            this.error =
                `Habitación ${roomNumber} ya está registrada.`;

            return;
        }

        if (!type) {

            this.error =
                'Ingresa el tipo de habitación.';

            return;
        }

        if (!internalRoom) {

            if (
                !Number.isFinite(price) ||
                price < 0
            ) {

                this.error =
                    'Ingresa un precio por hora válido.';

                return;
            }

            if (
                !Number.isFinite(nightPrice) ||
                nightPrice < 0
            ) {

                this.error =
                    'Ingresa un precio de toda la noche válido.';

                return;
            }
        }

        this.saving = true;

        const roomData: Omit<Room, 'id'> = {

            roomNumber,

            type,

            price,

            nightPrice,

            status,

            description
        };

        if (this.editingRoom) {

            const roomId =
                this.editingRoom.id;

            this.roomService
                .update(
                    roomId,
                    roomData
                )
                .subscribe({

                    next: updatedRoom => {

                        this.rooms =
                            this.rooms.map(
                                room =>
                                    room.id === roomId
                                        ? updatedRoom
                                        : room
                            );

                        this.showRoomModal =
                            false;

                        this.editingRoom =
                            null;

                        this.saving =
                            false;

                        this.showSavedRoomNotification();

                        this.cdr.detectChanges();
                    },

                    error: error => {

                        console.error(
                            'Error actualizando habitación:',
                            error
                        );

                        this.error =
                            error?.error?.message ??
                            'No se pudo actualizar la habitación.';

                        this.saving =
                            false;

                        this.cdr.detectChanges();
                    }
                });

            return;
        }

        this.roomService
            .create(roomData)
            .subscribe({

                next: createdRoom => {

                    this.rooms = [
                        ...this.rooms,
                        createdRoom
                    ];

                    this.showRoomModal =
                        false;

                    this.editingRoom =
                        null;

                    this.saving =
                        false;

                    this.showSavedRoomNotification();

                    this.cdr.detectChanges();
                },

                error: error => {

                    console.error(
                        'Error creando habitación:',
                        error
                    );

                    this.error =
                        error?.error?.message ??
                        'No se pudo crear la habitación. Verifica que el número no esté repetido.';

                    this.saving =
                        false;

                    this.cdr.detectChanges();
                }
            });
    }

    showSavedRoomNotification(): void {

        if (this.savedNotificationTimer) {
            clearTimeout(this.savedNotificationTimer);
        }

        this.showSavedNotification = true;

        this.cdr.detectChanges();

        this.savedNotificationTimer =
            setTimeout(() => {

                this.showSavedNotification = false;

                this.cdr.detectChanges();

            }, 2000);
    }

    openDeleteRoom(room: Room): void {

        this.clearMessages();

        this.selectedRoom =
            room;

        this.showDeleteModal =
            true;
    }

    closeDeleteModal(): void {

        if (this.saving) {
            return;
        }

        this.showDeleteModal =
            false;

        this.selectedRoom =
            null;
    }

    confirmDeleteRoom(): void {

        this.clearMessages();

        if (!this.selectedRoom) {
            return;
        }

        this.saving = true;

        const roomId =
            this.selectedRoom.id;

        this.roomService
            .delete(roomId)
            .subscribe({

                next: () => {

                    this.rooms =
                        this.rooms.filter(
                            room =>
                                room.id !== roomId
                        );

                    this.showDeleteModal =
                        false;

                    this.selectedRoom =
                        null;

                    this.saving =
                        false;

                    this.success =
                        'Habitación eliminada correctamente.';

                    this.cdr.detectChanges();
                },

                error: error => {

                    console.error(
                        'Error eliminando habitación:',
                        error
                    );

                    this.error =
                        error?.error?.message ??
                        'No se pudo eliminar la habitación. Puede tener reservas asociadas.';

                    this.saving =
                        false;

                    this.cdr.detectChanges();
                }
            });
    }

    getStatusLabel(
        status: RoomStatus
    ): string {
        return status;
    }

    getStatusClass(
        status: RoomStatus
    ): string {

        switch (status) {

            case 'DISPONIBLE':
                return 'status-available';

            case 'OCUPADA':
                return 'status-occupied';

            case 'LIMPIEZA':
                return 'status-cleaning';

            default:
                return '';
        }
    }

    clearMessages(): void {
        this.error = '';
        this.success = '';
    }
}