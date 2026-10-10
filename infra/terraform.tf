terraform {
  required_version = "1.15.6"

  cloud {
    organization = "Botropolis-City"

    workspaces {
      name = "botropolis-city"
    }
  }
}
