import { Role } from "../../enums/role.enum";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("users")
export class User {
    @PrimaryGeneratedColumn('uuid', {name: 'user_id'})
    userId: string;

    @Column({name: 'first_name',length: 25, nullable: true})
    firstName: string;

    @Column({name: 'last_name',length: 25, nullable: true})
    lastName: string;

    @Column({name: 'email',length: 50, unique: true, nullable: true})
    email: string;
    @Column({name: 'password',length: 100, nullable: true})
    password: string;

    @Column({name: 'facebook_id', nullable: true})
    facebookId: string;

    @Column({name: 'role', type: 'enum', enum: Role, default: Role.USER})
    role: Role[]

    @Column({name:'image_url',nullable: true})
    imageUrl: string;

    @Column({name: 'created_at', default: () => 'CURRENT_TIMESTAMP'})
    createdAt: Date;

    @Column({name: 'updated_at', default: () => 'CURRENT_TIMESTAMP'})
    updatedAt: Date;

    @Column({ nullable: true }) // Store refresh token
    refreshToken: string;

    @Column({ nullable: true })
    accessToken: string;
}