terraform {
  required_version = "1.16.5"

  cloud {
    organization = "Botropolis-City"

    workspaces {
      name = "botropolis-city"
    }
  }
}
