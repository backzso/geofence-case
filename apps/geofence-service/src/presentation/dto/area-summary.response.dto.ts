/**
 * AreaSummaryResponseDto
 *
 * HTTP response shape for area list and creation responses.
 * Maps directly from the application layer's AreaSummary type.
 *
 * Deliberately lean — no geometry fields are exposed in this step.
 */
export class AreaSummaryResponseDto {
  id: string;
  name: string;
  createdAt: Date;

  static from(summary: { id: string; name: string; createdAt: Date }): AreaSummaryResponseDto {
    const dto = new AreaSummaryResponseDto();
    dto.id = summary.id;
    dto.name = summary.name;
    dto.createdAt = summary.createdAt;
    return dto;
  }
}
