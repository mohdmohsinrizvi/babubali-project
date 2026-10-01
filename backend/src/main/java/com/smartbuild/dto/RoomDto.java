package com.smartbuild.dto;

public record RoomDto(
        String id,
        String name,
        String roomType,
        Double lengthFt,
        Double widthFt,
        Double heightFt,
        Double areaSqFt
) {
}
