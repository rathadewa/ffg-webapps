UPDATE `pengukuran_order_psb` SET `order_type` = 'fisik' WHERE CRC32(order_id) % 2 = 0;
