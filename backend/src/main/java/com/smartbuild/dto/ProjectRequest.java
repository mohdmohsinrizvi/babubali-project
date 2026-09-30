package com.smartbuild.dto;

import com.smartbuild.model.ProjectStatus;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record ProjectRequest(
        @NotBlank(message = "must not be blank")
        @Size(min = 2, max = 150, message = "must be between 2 and 150 characters")
        String name,

        @NotBlank(message = "must not be blank")
        @Size(max = 100, message = "must be at most 100 characters")
        String state,

        @NotBlank(message = "must not be blank")
        @Size(max = 100, message = "must be at most 100 characters")
        String district,

        @NotBlank(message = "must not be blank")
        @Size(max = 100, message = "must be at most 100 characters")
        String city,

        @NotBlank(message = "must not be blank")
        @Size(max = 100, message = "must be at most 100 characters")
        String constructionType,

        @NotNull(message = "must not be null")
        @Positive(message = "must be greater than 0")
        @Digits(integer = 10, fraction = 2, message = "must have at most 10 digits before and 2 after the decimal point")
        BigDecimal landAreaSqFt,

        @NotNull(message = "must not be null")
        @Positive(message = "must be greater than 0")
        @Digits(integer = 10, fraction = 2, message = "must have at most 10 digits before and 2 after the decimal point")
        BigDecimal builtUpAreaSqFt,

        @NotNull(message = "must not be null")
        @Min(value = 1, message = "must be greater than or equal to 1")
        @Max(value = 200, message = "must be less than or equal to 200")
        Integer floorCount,

        @PositiveOrZero(message = "must be greater than or equal to 0")
        @Digits(integer = 12, fraction = 2, message = "must have at most 12 digits before and 2 after the decimal point")
        BigDecimal budget,

        ProjectStatus status
) {
}
