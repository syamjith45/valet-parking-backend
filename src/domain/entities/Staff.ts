import { StaffRole, StaffPermissions } from '../value-objects/StaffRole';

export class Staff {
    constructor(
        public id: string,
        public authUserId: string,
        public name: string,
        public phone: string,
        public role: StaffRole,
        public isActive: boolean,
        public createdAt?: Date,
        public updatedAt?: Date
    ) { }

    canPerformEntry(): boolean {
        return StaffPermissions.canCreateVehicleEntry(this.role);
    }

    canPerformExit(): boolean {
        return StaffPermissions.canMarkDelivered(this.role);
    }

    isSupervisor(): boolean {
        return StaffPermissions.isSupervisor(this.role);
    }
}
