/**
 * ProcessLocationResponseDto
 *
 * HTTP response shape for POST /locations.
 * Maps directly from the use case result.
 */
export class ProcessLocationResponseDto {
    userId: string;
    enteredAreaIds: string[];
    exitedAreaIds: string[];
    timestamp: string;

    static from(result: {
        userId: string;
        enteredAreaIds: string[];
        exitedAreaIds: string[];
        timestamp: string;
    }): ProcessLocationResponseDto {
        const dto = new ProcessLocationResponseDto();
        dto.userId = result.userId;
        dto.enteredAreaIds = result.enteredAreaIds;
        dto.exitedAreaIds = result.exitedAreaIds;
        dto.timestamp = result.timestamp;
        return dto;
    }
}
