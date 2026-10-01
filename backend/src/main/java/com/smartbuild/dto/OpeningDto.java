package com.smartbuild.dto;

public record OpeningDto(
        String id,
        String openingType,
        Integer count,
        Double widthFt,
        Double heightFt
) {
}
