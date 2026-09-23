package com.hotelsol;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication(scanBasePackages = "com.hotelsol")
@EnableJpaRepositories(basePackages = "com.hotelsol")
public class HotelGirasolesBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(
				HotelGirasolesBackendApplication.class,
				args);
	}
}