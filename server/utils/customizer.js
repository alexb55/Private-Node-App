module.exports = {
  processCustomizerOptions: line_items => {
    return line_items
      .map(li => {
        let customizerOptionsPrice = 0; //,
        //customizerOptionsCap = 0;
        line_items.map(innerLi => {
          innerLi.properties.map(innerLiProperty => {
            if (
              innerLiProperty.name.toLowerCase().trim() == 'XXXXXXX' &&
              parseFloat(innerLiProperty.value) == parseFloat(li.variant_id)
            ) {
              let customizerOrCorrectModifications = true;
              if (innerLi.product_id.toString() == 'XXXXXXXXX') {
                customizerOrCorrectModifications = false;
                li.properties.map(lip => {
                  if (
                    lip.name
                      .toLowerCase()
                      .trim()
                      .indexOf('XXXXXXXXXXX') > -1 &&
                    lip.value.indexOf(innerLi.variant_title) > -1
                  ) {
                    customizerOrCorrectModifications = true;
                  }
                });
              }
              if (customizerOrCorrectModifications) {
                customizerOptionsPrice +=
                  parseFloat(innerLi.price) * innerLi.quantity / li.quantity;
                li.discount_allocations = li.discount_allocations.concat(
                  innerLi.discount_allocations
                );
                li.tax_lines = li.tax_lines.concat(innerLi.tax_lines);
              }
            }
          });
        });
        li.price = parseFloat(li.price) + parseFloat(customizerOptionsPrice);
        return li;
      })
      .filter(li => {
        let show = true;
        li.properties.map(lip => {
          if (lip.name.toLowerCase().trim() == 'XXXXXXXX') {
            show = false;
          }
        });
        return show;
      });
  },
};
